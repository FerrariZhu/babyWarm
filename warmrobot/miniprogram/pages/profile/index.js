const { authenticatedRequest } = require("../../utils/session");

const SELECTED_BABY_KEY = "warmrobot_selected_baby";
const WARMTH_OPTIONS = [
  { value: "runs_cold", label: "怕冷" },
  { value: "slightly_cold", label: "偏怕冷" },
  { value: "neutral", label: "正常" },
  { value: "slightly_hot", label: "偏怕热" },
  { value: "runs_hot", label: "怕热" },
];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function emptyForm() {
  return {
    name: "", birth_date: "", gender: "", height_cm: "", weight_kg: "",
    warmth_preference: "neutral", wears_diaper: "",
  };
}

function validBirthDate(value, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > end) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function profileView(baby) {
  return {
    ...baby,
    birth_date: String(baby.birth_date || "").slice(0, 10),
    genderLabel: baby.gender === "female" ? "女孩" : baby.gender === "male" ? "男孩" : "待完善",
    warmthLabel: WARMTH_OPTIONS.find((option) => option.value === baby.warmth_preference)?.label || "正常",
  };
}

Page({
  data: {
    babies: [], selectedId: "", loading: false, saving: false, error: "",
    mode: "list", editingId: "", form: emptyForm(), today: "",
    warmthOptions: WARMTH_OPTIONS, warmthIndex: 2,
  },

  onLoad(options = {}) {
    this._unloaded = false;
    this._loadVersion = 0;
    this._savedPayload = "";
    this.setData({ today: today() });
    if (options.mode === "add") this.addBaby();
  },

  onShow() {
    return this.loadBabies();
  },

  onUnload() {
    this._unloaded = true;
    this._loadVersion += 1;
  },

  handleError(error) {
    if (this._unloaded) return;
    if (error?.code === "AUTH_REQUIRED" || error?.statusCode === 401) {
      wx.reLaunch({ url: "/pages/login/index" });
      return;
    }
    this.setData({ error: error?.message || "网络异常，请稍后重试。" });
  },

  async loadBabies() {
    if (this.data.loading || this.data.saving || this._unloaded) return;
    const version = ++this._loadVersion;
    this.setData({ loading: true, error: "" });
    try {
      const response = await authenticatedRequest("/api/babies");
      if (this._unloaded || version !== this._loadVersion) return;
      if (response.statusCode !== 200 || !Array.isArray(response.data?.babies)) {
        const error = new Error(response.data?.error || "宝宝档案加载失败，请重试。");
        error.statusCode = response.statusCode;
        throw error;
      }
      const babies = response.data.babies.map(profileView);
      const savedId = wx.getStorageSync(SELECTED_BABY_KEY);
      const selected = babies.find((baby) => baby.id === savedId)
        || babies.find((baby) => baby.is_active) || babies[0];
      if (selected) wx.setStorageSync(SELECTED_BABY_KEY, selected.id);
      else wx.removeStorageSync(SELECTED_BABY_KEY);
      this.setData({ babies, selectedId: selected?.id || "" });
    } catch (error) {
      if (version === this._loadVersion) this.handleError(error);
    } finally {
      if (!this._unloaded && version === this._loadVersion) this.setData({ loading: false });
    }
  },

  addBaby() {
    if (this.data.saving) return;
    this._savedPayload = "";
    this.setData({ mode: "form", editingId: "", form: emptyForm(), warmthIndex: 2, error: "" });
  },

  editBaby(event) {
    if (this.data.saving) return;
    const baby = this.data.babies.find((item) => item.id === event.currentTarget.dataset.id);
    if (!baby) return;
    this._savedPayload = "";
    const savedWarmthIndex = WARMTH_OPTIONS.findIndex((option) => option.value === baby.warmth_preference);
    const warmthIndex = savedWarmthIndex >= 0 ? savedWarmthIndex : 2;
    this.setData({
      mode: "form", editingId: baby.id, error: "", warmthIndex,
      form: {
        name: baby.name || "", birth_date: baby.birth_date, gender: baby.gender || "",
        height_cm: baby.height_cm == null ? "" : String(baby.height_cm),
        weight_kg: baby.weight_kg == null ? "" : String(baby.weight_kg),
        warmth_preference: WARMTH_OPTIONS[warmthIndex].value,
        wears_diaper: baby.wears_diaper === true ? "yes" : baby.wears_diaper === false ? "no" : "",
      },
    });
  },

  changeField(event) {
    if (this.data.saving) return;
    const field = event.currentTarget.dataset.field;
    if (!["name", "height_cm", "weight_kg", "birth_date"].includes(field)) return;
    this.setData({ form: { ...this.data.form, [field]: event.detail.value }, error: "" });
  },

  changeChoice(event) {
    if (this.data.saving) return;
    const { field, value } = event.currentTarget.dataset;
    const allowed = { gender: ["male", "female"], wears_diaper: ["yes", "no"] };
    if (!allowed[field]?.includes(value)) return;
    this.setData({ form: { ...this.data.form, [field]: value }, error: "" });
  },

  changeWarmth(event) {
    if (this.data.saving) return;
    const index = Number(event.detail.value);
    if (!WARMTH_OPTIONS[index]) return;
    this.setData({
      warmthIndex: index,
      form: { ...this.data.form, warmth_preference: WARMTH_OPTIONS[index].value },
      error: "",
    });
  },

  cancelForm() {
    if (this.data.saving) return;
    this._savedPayload = "";
    this.setData({ mode: "list", editingId: "", form: emptyForm(), error: "" });
  },

  async saveBaby() {
    if (this.data.saving || this._unloaded) return;
    const form = this.data.form;
    let error = "";
    if (!form.name.trim()) error = "请输入宝宝名字。";
    else if (!["male", "female"].includes(form.gender)) error = "请选择性别。";
    else if (!validBirthDate(form.birth_date, today())) error = "请选择有效生日，不能晚于今天。";
    else if (!Number.isFinite(Number(form.height_cm)) || Number(form.height_cm) <= 0) error = "请输入有效身高。";
    else if (!Number.isFinite(Number(form.weight_kg)) || Number(form.weight_kg) <= 0) error = "请输入有效体重。";
    else if (!["yes", "no"].includes(form.wears_diaper)) error = "请选择是否仍穿尿布。";
    if (error) { this.setData({ error }); return; }

    const editingId = this.data.editingId;
    const payload = { ...form, name: form.name.trim(), height_cm: Number(form.height_cm), weight_kg: Number(form.weight_kg) };
    const fingerprint = JSON.stringify(payload);
    // A successful save followed by a delayed/failed navigation must not create a second baby.
    if (editingId && this._savedPayload === fingerprint) {
      this.openSavedBaby();
      return;
    }
    this.setData({ saving: true, error: "" });
    try {
      const response = await authenticatedRequest(
        editingId ? `/api/babies/${encodeURIComponent(editingId)}` : "/api/babies",
        editingId ? "PATCH" : "POST",
        payload,
      );
      if (this._unloaded) return;
      if (response.statusCode !== 200 || !response.data?.id) {
        const saveError = new Error(response.data?.error || "保存失败，请重试。");
        saveError.statusCode = response.statusCode;
        throw saveError;
      }
      wx.setStorageSync(SELECTED_BABY_KEY, response.data.id);
      this._savedPayload = fingerprint;
      this.setData({ editingId: response.data.id });
      this.openSavedBaby();
    } catch (error) {
      this.handleError(error);
    } finally {
      if (!this._unloaded) this.setData({ saving: false });
    }
  },

  openSavedBaby() {
    wx.reLaunch({
      url: "/pages/home/index",
      fail: () => {
        if (!this._unloaded) this.setData({ error: "档案已保存，暂时无法返回首页，请再次点击保存重试。" });
      },
    });
  },

  selectBaby(event) {
    if (this.data.saving) return;
    const id = event.currentTarget.dataset.id;
    if (!this.data.babies.some((baby) => baby.id === id)) return;
    wx.setStorageSync(SELECTED_BABY_KEY, id);
    wx.reLaunch({ url: "/pages/home/index" });
  },

  goHome() {
    if (!this.data.saving) wx.reLaunch({ url: "/pages/home/index" });
  },
});
