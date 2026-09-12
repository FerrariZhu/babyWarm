# 衣物指南已审核图片

`<品类编码>/category/overview.png` 是 25 个衣物品类的已审核代表图。图片统一放入透明 4:3 画布，供 C 端衣物指南顶部展示；对应数据库记录由 `20260911131424_category_guide_overview_images.sql` 发布。

`bodysuit_short/bodysuit_style/*.png` 是短袖包屁衣已有的细款图片，继续显示在具体款式卡片中。

| 文件 | 资产键 | alt |
| --- | --- | --- |
| `bodysuit_short/bodysuit_style/triangle.png` | `bodysuit_short/style/bodysuit_style/triangle` | 短袖三角款包屁衣，裆部有按扣、无裤腿 |
| `bodysuit_short/bodysuit_style/long_leg.png` | `bodysuit_short/style/bodysuit_style/long_leg` | 短袖长裤款包屁衣，裆部有按扣、裤腿连体 |

## 生成来源

- 工具：内建图像生成。
- 统一约束：正面单件、无真人、无品牌、无文字、无水印、透明背景、柔和棚拍光、适合 4:3 卡片裁切。
- 三角款提示：短袖婴儿包屁衣；三角腿口，裆部三颗按扣，无裤腿；暖白主体与鼠尾草绿包边。
- 长裤款提示：短袖婴儿连体长裤包屁衣；裤腿连体，裆部及内腿按扣；低饱和鼠尾草绿。

后台后续重新上传品类图时使用保留键 `category/overview`。上传即生成不可变版本路径并发布到 C 端；未审核记录不会被前端图片路由读取。
