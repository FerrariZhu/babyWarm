import type { ClothingCategory } from "./types";

/** Original library artwork. Sources, versions and licenses: ../assets/garment-icons/README.md. */
export type GarmentIcon = {
  viewBox: string;
  nodes: readonly { tag: "path" | "circle" | "rect" | "ellipse" | "line" | "polyline" | "polygon"; attrs: Record<string, string> }[];
};

const ARTWORK: Record<string, GarmentIcon> = {
  "lucide-trousers": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M4 6h16"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 22a2 2 0 0 1-2-2V3c0-.6.4-1 1-1h14c.6 0 1 .4 1 1v17a2 2 0 0 1-2 2h-3l-3-10-3 10Z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m6 11-2 1"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M9 8.5V6"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M15 6v2.5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m20 12-2-1"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M4 18h6"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M14 18h6"
        }
      }
    ]
  },
  "iconpark-romper": {
    "viewBox": "0 0 48 48",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "m6.572 19.575l-2.165-7.217c-.244-.813.048-1.696.765-2.15C8.057 8.377 14.642 5 24 5c9.343 0 15.8 3.366 18.759 5.198c.748.463 1.068 1.377.816 2.22l-2.147 7.157A2 2 0 0 1 39.512 21H36c-1.105 0-2 .891-2 1.996v10.006c0 1.104-.905 2.011-1.973 2.295c-1.299.345-2.952 1.09-4.027 2.703c-2 3-2 6-2 6h-4s0-3-2-6c-1.075-1.613-2.728-2.358-4.027-2.703c-1.068-.284-1.973-1.19-1.973-2.295V22.996A1.996 1.996 0 0 0 12 21H8.488a2 2 0 0 1-1.916-1.425"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M29.811 5.5a6 6 0 1 1-11.622 0"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M13.5 6.494A37 37 0 0 1 24 5c4.043 0 7.545.63 10.457 1.494"
        }
      }
    ]
  },
  "lucide-jacket": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M8 4c0 1.1 1.8 2 4 2s4-.9 4-2V3c0-.6-.4-1-1-1H9c-.6 0-1 .4-1 1Z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M8 4c0 2 4 5 4 10v8"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M12 14c0-5 4-8 4-10"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 19H3c-.6 0-1-.4-1-1V7c0-1.1.8-2.3 1.9-2.6L8 3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M18 9v12c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m16 3 4.1 1.4C21.2 4.7 22 5.9 22 7v11c0 .6-.4 1-1 1h-3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m6 15 2-2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m18 15-2-2"
        }
      }
    ]
  },
  "lucide-shorts": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M2 8h20"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M9 20H4a2 2 0 0 1-2-2V5c0-.6.4-1 1-1h18c.6 0 1 .4 1 1v13a2 2 0 0 1-2 2h-5l-3-5Z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M9 12V8"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M15 8v4"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m5 13-3 2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m22 15-3-2"
        }
      }
    ]
  },
  "iconpark-clothes-gloves": {
    "viewBox": "0 0 48 48",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M35 27V17m0 0v-5c0-3.771 0-5.657-1.172-6.828S30.771 4 27 4H15c-3.771 0-5.657 0-6.828 1.172S7 8.229 7 12v32h28v-7s7 0 7-6v-8c0-6-7-6-7-6m-21 5V4m7 18V4m7 18V4M12 4h18"
        }
      }
    ]
  },
  "lucide-socks": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M9.6 20.4 9 21a3.38 3.38 0 1 1-4.9-4.9l3.5-3.5C8.4 11.6 9 10.4 9 9V3c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v10a5.15 5.15 0 0 1-1.5 3.6L15 21a3.38 3.38 0 1 1-4.9-4.9l3.5-3.5c.8-1 1.4-2.2 1.4-3.6V2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M9 6h12"
        }
      }
    ]
  },
  "iconpark-sandals": {
    "viewBox": "0 0 48 48",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeWidth": "4",
          "strokeLinejoin": "bevel",
          "d": "m11.2 6.854l-.708.225c-3.487 1.104-5.536 4.71-4.898 8.312c.73 4.115 1.291 8.04 2.095 11.661c.785 3.537.447 6.689.25 10.032c-.192 3.266 2.409 5.843 5.672 6.07c4.623.321 8.182-4.082 7.297-8.63c-.684-3.516-1.202-7.318-.969-10.024c.25-2.904.277-7.29.23-11.251c-.055-4.616-4.568-7.788-8.968-6.395Zm23.61-1.131l-.77.144c-3.455.648-5.892 3.761-5.926 7.277C28.071 17.701 27.831 22.15 28 26c.156 3.553-.437 6.153-1.017 9.053c-.626 3.13 1.443 6.044 4.54 6.815c4.485 1.116 8.712-2.698 8.577-7.318c-.093-3.175.03-6.512.681-8.95c.79-2.96 1.547-7.903 2.129-12.314c.61-4.632-3.509-8.424-8.1-7.563Z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeWidth": "4",
          "strokeLinejoin": "round",
          "strokeMiterlimit": "2",
          "d": "M8 29c1-9 6-14 6-14c1.636 2 4 8 6 14m20 1c.5-8-5-16-5-16c-1.636 2-7 5.278-7 11.5"
        }
      }
    ]
  },
  "lucide-jacket-sports": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M8 4c0 1.1 1.8 2 4 2s4-.9 4-2V3c0-.6-.4-1-1-1H9c-.6 0-1 .4-1 1Z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M8 4c0 2 4 5 4 10v8"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M12 14c0-5 4-8 4-10"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 19H3c-.6 0-1-.4-1-1V7c0-1.1.8-2.3 1.9-2.6L8 3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M18 9v12c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m16 3 4.1 1.4C21.2 4.7 22 5.9 22 7v11c0 .6-.4 1-1 1h-3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M2 15h4l2-2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M22 15h-4l-2-2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 18h12"
        }
      }
    ]
  },
  "lucide-shirt-t-v-neck": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 11H3c-.6 0-1-.4-1-1V6c0-1.1.8-2.3 1.9-2.6L8 2c0 2.2 3 5 4 5s4-2.8 4-5l4.1 1.4C21.2 3.7 22 4.9 22 6v4c0 .6-.4 1-1 1h-3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M18 8v13c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V8"
        }
      }
    ]
  },
  "lucide-scarf": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M19.5 2.5 7 15c-.5.5-.6 1.5-.2 2L9 20 21.6 7.6a2 1.7 0 0 0 .1-1.9l-2-3c-.2-.4-.7-.7-1.2-.7h-13c-.5 0-1 .3-1.2.7l-2 3a2 1.7 0 0 0 .2 2l6 5.8"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M12 10 4.5 2.5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M13 20v2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M16 6H8"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M17 12.1V22"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M17 18h4"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M17 20H9v2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M21 8.2V20"
        }
      }
    ]
  },
  "lucide-shirt-long-sleeve": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 19H3c-.6 0-1-.4-1-1V6c0-1.1.8-2.3 1.9-2.6L8 2a4 4 0 0 0 8 0l4.1 1.4C21.2 3.7 22 4.9 22 6v12c0 .6-.4 1-1 1h-3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M18 8v13c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V8"
        }
      }
    ]
  },
  "lucide-hat-beanie": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M10.4 6.2C6.7 6.9 4 10.1 4 14v1"
        }
      },
      {
        "tag": "circle",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "cx": "12",
          "cy": "5",
          "r": "2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M20 15v-1c0-3.9-2.7-7.1-6.4-7.8"
        }
      },
      {
        "tag": "rect",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "x": "2",
          "y": "15",
          "rx": "1",
          "width": "20",
          "height": "5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 15v5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M10 15v5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M14 15v5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M18 15v5"
        }
      }
    ]
  },
  "iconpark-clothes-pants-sweat": {
    "viewBox": "0 0 48 48",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "m24 19l9 19h9L38 4H10L6 38h9zm10 19l1 6h6v-6zm-21 6H7v-6h7zM24 4l4 7.5M24 4l-4 7.5"
        }
      }
    ]
  },
  "lucide-bag-hand": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M8 8c0-2.8 1.8-5 4-5s4 2.2 4 5"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m21 18.6-2-9.8c-.1-.5-.5-.8-1-.8H6c-.5 0-.9.3-1 .8l-2 9.8v.4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M12 12v4"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M18 8A6 6 0 0 1 6 8"
        }
      }
    ]
  },
  "lucide-sneaker": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M14.1 7.9 12.5 10"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M17.4 10.1 16 12"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M2 16a2 2 0 0 0 2 2h13c2.8 0 5-2.2 5-5a2 2 0 0 0-2-2c-.8 0-1.6-.2-2.2-.7l-6.2-4.2c-.4-.3-.9-.2-1.3.1 0 0-.6.8-1.2 1.1a3.5 3.5 0 0 1-4.2.1C4.4 7 3.7 6.3 3.7 6.3A.92.92 0 0 0 2 7Z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M2 11c0 1.7 1.3 3 3 3h7"
        }
      }
    ]
  },
  "iconpark-boots": {
    "viewBox": "0 0 48 48",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M19 4h16l-4 32l1.236.618A5 5 0 0 1 35 41.09V44H10v-2l13-6zm1 8h14"
        }
      }
    ]
  },
  "lucide-sweater": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M6 19H3c-.6 0-1-.4-1-1V6c0-1.1.8-2.3 1.9-2.6L8 2a4 4 0 0 0 8 0l4.1 1.4C21.2 3.7 22 4.9 22 6v12c0 .6-.4 1-1 1h-3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M18 8v13c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V8"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m6 10 2 2 2-2 2 2 2-2 2 2 2-2"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "m6 16 2 2 2-2 2 2 2-2 2 2 2-2"
        }
      }
    ]
  },
  "lucide-vest": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M10 4a2 2 0 0 0 4 0V3h4v3c0 1.7 1.3 3 3 3v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9c1.7 0 3-1.3 3-3V3h4Z"
        }
      }
    ]
  },
  "lucide-hat-baseball": {
    "viewBox": "0 0 24 24",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M12 3v1"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M12 14c2.8 0 5.5.3 8 .9V12a8 8 0 0 0-16 0v2.9c2.5-.6 5.2-.9 8-.9"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M9 14.1V10h6v4.1"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeWidth": "2",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "d": "M2.3 18A2 2 0 0 0 4 21h.4l1.6-.4a26.44 26.44 0 0 1 12 0l1.6.4h.4a2 2 0 0 0 1.7-3l-1.8-3.2a39.9 39.9 0 0 0-15.8 0Z"
        }
      }
    ]
  },
  "iconpark-sun-hat": {
    "viewBox": "0 0 48 48",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M12 10a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v10H12zm32 25c-1.108 1.333-2.375 5-7.6 5c-2.737 0-6.456-1.684-11.4-3"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M4 35s6-9 8-15h24c2 6 8 15 8 15c-6-4-25 5-32 5c-5.5 0-6.833-3.667-8-5"
        }
      }
    ]
  },
  "iconpark-clothes-diapers": {
    "viewBox": "0 0 48 48",
    "nodes": [
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M6 11h36v8s0 8-4 12s-10.158 6-10.158 6h-7.684S14 35 10 31S6 19 6 19z"
        }
      },
      {
        "tag": "path",
        "attrs": {
          "fill": "none",
          "stroke": "currentColor",
          "strokeLinecap": "round",
          "strokeLinejoin": "round",
          "strokeWidth": "4",
          "d": "M20.158 37s.1-7.074-3.158-11c-3.044-3.669-11-7-11-7m21.842 18s-.1-7.075 3.158-11c3.044-3.669 11-7 11-7"
        }
      }
    ]
  }
};

export const GARMENT_ICON_SOURCES: Record<ClothingCategory, string> = {
  "bodysuit_short": "iconpark-romper",
  "bodysuit_long": "iconpark-romper",
  "tshirt_short": "lucide-shirt-t-v-neck",
  "tshirt_long": "lucide-shirt-long-sleeve",
  "thermal_top": "lucide-shirt-long-sleeve",
  "sweater": "lucide-sweater",
  "fleece_top": "lucide-jacket-sports",
  "vest": "lucide-vest",
  "vest_down": "lucide-vest",
  "outer_uv": "lucide-jacket-sports",
  "outer_shell": "lucide-jacket-sports",
  "outer_cotton": "lucide-jacket",
  "outer_down": "lucide-jacket",
  "long_johns": "iconpark-clothes-pants-sweat",
  "pants_short": "lucide-shorts",
  "pants_mid": "lucide-trousers",
  "pants_long": "lucide-trousers",
  "shoes_sandal": "iconpark-sandals",
  "shoes_sneaker": "lucide-sneaker",
  "shoes_leather": "lucide-sneaker",
  "shoes_boot": "iconpark-boots",
  "hat": "lucide-hat-baseball",
  "scarf": "lucide-scarf",
  "gloves": "iconpark-clothes-gloves",
  "socks": "lucide-socks",
  "other": "lucide-bag-hand"
};

export function garmentIcon(key: string): GarmentIcon | undefined {
  if (key === "garment_hat_sun") return ARTWORK["iconpark-sun-hat"];
  if (key === "garment_hat_warm") return ARTWORK["lucide-hat-beanie"];
  if (key === "garment_diaper") return ARTWORK["iconpark-clothes-diapers"];
  const code = key === "socks" || key === "sweater" ? key : key.startsWith("garment_") ? key.slice(8) : "";
  return Object.hasOwn(GARMENT_ICON_SOURCES, code)
    ? ARTWORK[GARMENT_ICON_SOURCES[code as ClothingCategory]] : undefined;
}
