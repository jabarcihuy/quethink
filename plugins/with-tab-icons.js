const { withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");
// Reuse the authored prototype SVG geometry as native Android vector drawables.
module.exports = function withTabIcons(config) {
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const target = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/res/drawable",
      );
      await fs.mkdir(target, { recursive: true });
      for (const name of ["home", "book", "users", "qr", "forum", "user"]) {
        const svg = await fs.readFile(
          path.join(
            mod.modRequest.projectRoot,
            "docs/assets/icons",
            name + ".svg",
          ),
          "utf8",
        );
        const paths = [...svg.matchAll(/<path d="([^"]+)"/g)]
          .map(
            (match) =>
              `<path android:pathData="${match[1]}" android:fillColor="@android:color/transparent" android:strokeColor="#FF24243A" android:strokeWidth="1.75" android:strokeLineCap="round" android:strokeLineJoin="round"/>`,
          )
          .join("\n");
        if (!paths) throw Error("Prototype icon has no vector path: " + name);
        await fs.writeFile(
          path.join(target, "quethink_" + name + ".xml"),
          `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">${paths}</vector>`,
        );
      }
      return mod;
    },
  ]);
};
