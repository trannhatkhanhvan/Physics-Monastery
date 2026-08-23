import {
  createFigureEightS3ComplementProjection,
} from "../../../figure-eight-complement/figureEightS3ComplementProjection";


export const dynamic =
  "force-dynamic";


export async function GET() {
  const projection =
    createFigureEightS3ComplementProjection();


  if (
    !projection.valid
  ) {
    return Response.json(
      {
        valid:
          false,

        failures:
          projection.failures,

        summary:
          projection.summary,
      },

      {
        status:
          500,
      }
    );
  }


  const vertices =
    [];


  for (
    let index = 0;
    index <
      projection.vertices3.length;
    index += 3
  ) {
    vertices.push([
      projection.vertices3[
        index
      ],

      projection.vertices3[
        index + 1
      ],

      projection.vertices3[
        index + 2
      ],
    ]);
  }


  const faces =
    [];


  for (
    let index = 0;
    index <
      projection.indices.length;
    index += 3
  ) {
    faces.push([
      projection.indices[
        index
      ],

      projection.indices[
        index + 1
      ],

      projection.indices[
        index + 2
      ],
    ]);
  }


  return Response.json({
    valid:
      true,

    method:
      projection.method,

    vertices,

    faces,

    pole4:
      projection.pole4,

    projectionBasis4:
      projection.projectionBasis4,

    complementTestPoint3:
      projection.complementTestPoint3,

    summary:
      projection.summary,
  });
}
