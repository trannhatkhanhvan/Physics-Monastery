import {
  readFile,
} from "node:fs/promises";


export async function load(
  url,
  context,
  defaultLoad
) {
  if (
    url.endsWith(
      ".json"
    )
  ) {
    const source =
      await readFile(
        new URL(
          url
        ),
        "utf8"
      );

    return {
      format:
        "module",

      source:
        `export default ${source};`,

      shortCircuit:
        true,
    };
  }

  return defaultLoad(
    url,
    context
  );
}
