    (function () {
      const itemTypes = Object.freeze({
        graphic: Object.freeze({
          label: "Printed graphic",
          printLabel: "Graphic",
          defaultName: "Printed graphic",
          defaultShape: "rect",
          shapes: Object.freeze(["rect", "circle"]),
          defaultWidth: 1200,
          defaultHeight: 800,
          color: "#2f6f9f",
          textPlaceholder: "Optional caption or words printed on the graphic",
          notesPlaceholder: "Print file, material, finish, or mounting notes",
          aliases: Object.freeze(["artwork", "printed graphic", "graphic"])
        }),
        mdf: Object.freeze({
          label: "MDF cutout / sticker",
          printLabel: "MDF/sticker",
          defaultName: "MDF cutout / sticker",
          defaultShape: "rect",
          shapes: Object.freeze(["rect", "circle"]),
          defaultWidth: 700,
          defaultHeight: 700,
          color: "#e58b4a",
          textPlaceholder: "Optional words on the cutout or sticker",
          notesPlaceholder: "Cut path, material thickness, adhesive, or install notes",
          aliases: Object.freeze(["cutout", "mdf", "mdf cutout", "sticker", "mdf cutout/sticker", "mdf cutout / sticker"])
        }),
        object: Object.freeze({
          label: "Object / prototype",
          printLabel: "Object",
          defaultName: "Object / prototype",
          defaultShape: "rect",
          shapes: Object.freeze(["rect", "circle"]),
          defaultWidth: 600,
          defaultHeight: 600,
          color: "#6e63b6",
          textPlaceholder: "Optional visible label on the object",
          notesPlaceholder: "Prototype, plinth, fixture, power, or handling notes",
          aliases: Object.freeze(["illumination", "prototype", "physical object", "object/prototype", "object / prototype", "object"])
        }),
        screen: Object.freeze({
          label: "Screen",
          printLabel: "Screen",
          defaultName: "Screen",
          defaultShape: "rect",
          shapes: Object.freeze(["rect"]),
          defaultWidth: 1800,
          defaultHeight: 900,
          color: "#151515",
          textPlaceholder: "Optional on-screen title or visible label",
          notesPlaceholder: "Media file, player, power, cabling, or looping notes",
          aliases: Object.freeze(["screen"])
        }),
        support: Object.freeze({
          label: "Supporting structure / shelf",
          printLabel: "Support/shelf",
          defaultName: "Supporting structure / shelf",
          defaultShape: "rect",
          shapes: Object.freeze(["rect"]),
          defaultWidth: 1200,
          defaultHeight: 300,
          color: "#7b5d46",
          textPlaceholder: "Optional visible marking",
          notesPlaceholder: "Load, bracket, shelf height, finish, or fabrication notes",
          aliases: Object.freeze(["shelf", "opening", "mount", "support", "supporting structure", "supporting structure/shelf", "supporting structure / shelf"])
        }),
        text: Object.freeze({
          label: "Text",
          printLabel: "Text",
          defaultName: "Text",
          defaultShape: "rect",
          shapes: Object.freeze(["rect"]),
          defaultWidth: 900,
          defaultHeight: 220,
          color: "#f4f1e8",
          textPlaceholder: "Words shown on the wall",
          notesPlaceholder: "Typography, language, vinyl, paint, or approval notes",
          aliases: Object.freeze(["label", "explanatory text", "title", "title text", "text"])
        })
      });

      const roomElementTypes = Object.freeze({
        chair: Object.freeze({
          label: "Chair",
          defaultName: "Chair",
          defaultShape: "rect",
          shapes: Object.freeze(["rect", "circle"]),
          defaultWidth: 520,
          defaultDepth: 520,
          defaultHeight: 900,
          color: "#60748a",
          aliases: Object.freeze(["chair", "seat", "seating"])
        }),
        projection: Object.freeze({
          label: "Projection screen",
          defaultName: "Projection screen",
          defaultShape: "rect",
          shapes: Object.freeze(["rect"]),
          defaultWidth: 2500,
          defaultDepth: 180,
          defaultHeight: 1500,
          color: "#27364f",
          aliases: Object.freeze(["projection", "projection screen", "projector screen", "screen"])
        }),
        table: Object.freeze({
          label: "Table",
          defaultName: "Table",
          defaultShape: "rect",
          shapes: Object.freeze(["rect", "circle"]),
          defaultWidth: 1800,
          defaultDepth: 900,
          defaultHeight: 760,
          color: "#8a7a54",
          aliases: Object.freeze(["table", "desk"])
        }),
        other: Object.freeze({
          label: "Other placeholder",
          defaultName: "Other placeholder",
          defaultShape: "rect",
          shapes: Object.freeze(["rect", "circle"]),
          defaultWidth: 900,
          defaultDepth: 900,
          defaultHeight: 1200,
          color: "#777e6b",
          aliases: Object.freeze(["other"])
        })
      });

      const defaultWallItems = Object.freeze([
        Object.freeze({ name: "Printed graphic", type: "graphic", side: "front", shape: "rect", text: "", notes: "", hanging: false, illuminated: false, x: 900, y: 900, width: 1200, height: 800, color: "#2f6f9f" }),
        Object.freeze({ name: "Text", type: "text", side: "front", shape: "rect", text: "Intro text", notes: "", hanging: false, illuminated: false, x: 2400, y: 1700, width: 900, height: 220, color: "#f4f1e8" }),
        Object.freeze({ name: "Object / prototype", type: "object", side: "front", shape: "circle", text: "", notes: "Needs power nearby", hanging: true, illuminated: true, x: 3300, y: 2050, width: 420, height: 420, color: "#6e63b6" }),
        Object.freeze({ name: "Screen", type: "screen", side: "back", shape: "rect", text: "", notes: "Back-side media test", hanging: false, illuminated: false, x: 3600, y: 650, width: 1800, height: 900, color: "#151515" })
      ]);

      window.EWMM_DATA = Object.freeze({
        itemTypes,
        roomElementTypes,
        defaultWallItems,
        makeDefaultWallItems(uid) {
          return defaultWallItems.map(item => {
            const next = { ...item };
            if (typeof uid === "function") next.id = uid();
            return next;
          });
        }
      });
    })();
