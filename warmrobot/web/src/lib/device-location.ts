/** 浏览器 Geolocation API（需 HTTPS 或 localhost） */

export class DeviceLocationError extends Error {
  code: "unsupported" | "denied" | "unavailable" | "timeout" | "unknown";

  constructor(
    code: DeviceLocationError["code"],
    message: string
  ) {
    super(message);
    this.name = "DeviceLocationError";
    this.code = code;
  }
}

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

const FAST_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 12_000,
  maximumAge: 10 * 60_000,
};

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

function mapGeolocationError(error: GeolocationPositionError): DeviceLocationError {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return new DeviceLocationError("denied", "定位权限被拒绝，请在浏览器设置中允许访问位置");
    case error.POSITION_UNAVAILABLE:
      return new DeviceLocationError("unavailable", "无法获取当前位置，请检查设备定位是否开启");
    case error.TIMEOUT:
      return new DeviceLocationError("timeout", "自动定位超时，请搜索城市、区或镇选择地点");
    default:
      return new DeviceLocationError("unknown", "定位失败，请稍后重试");
  }
}

function toCoordinates(position: GeolocationPosition): DeviceCoordinates {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

function getPositionOnce(options: PositionOptions): Promise<DeviceCoordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(toCoordinates(position)),
      (error) => reject(mapGeolocationError(error)),
      options
    );
  });
}

/** watchPosition 有时比 getCurrentPosition 更容易在桌面端拿到结果 */
function getPositionViaWatch(options: PositionOptions): Promise<DeviceCoordinates> {
  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeout ?? 15_000;
    let settled = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      navigator.geolocation.clearWatch(watchId);
      fn();
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => finish(() => resolve(toCoordinates(position))),
      (error) => finish(() => reject(mapGeolocationError(error))),
      options
    );

    const timer = setTimeout(() => {
      finish(() =>
        reject(new DeviceLocationError("timeout", "自动定位超时，请搜索城市、区或镇选择地点"))
      );
    }, timeoutMs);
  });
}

export function getDeviceLocation(
  options: PositionOptions = FAST_OPTIONS
): Promise<DeviceCoordinates> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new DeviceLocationError("unsupported", "当前浏览器不支持定位")
    );
  }

  const fastOptions = { ...FAST_OPTIONS, ...options };

  return getPositionOnce(fastOptions).catch(async (error) => {
    if (!(error instanceof DeviceLocationError) || error.code !== "timeout") {
      throw error;
    }
    return getPositionViaWatch(WATCH_OPTIONS);
  });
}
