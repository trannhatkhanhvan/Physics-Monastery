import M129_CUSP_TRIANGLES
  from "../data/generated/m129_cusp_triangles.json";

import {
  buildS3Tube,
  sampleS3TubePoint4,
} from "./s3BoundaryGeometry.js";

import {
  DEFAULT_M129_S3_EPSILON,
  DEFAULT_M129_S3_LAMBDA,
  m129S3CenterlinePoint,
} from "./m129S3Centerlines.js";


export const M129_BOUNDARY_RHO = 0.12;
export const M129_BOUNDARY_NU = 288;
export const M129_BOUNDARY_NV = 64;


function translationForCusp(cuspIndex) {
  const record =
    M129_CUSP_TRIANGLES
      .cusp_translations
      .find(
        (item) =>
          item.cusp === cuspIndex
      );

  if (!record) {
    throw new Error(
      `Missing m129 cusp translation record for cusp ${cuspIndex}.`
    );
  }

  return record;
}


/*
 * Solve
 *
 *   z = m M + l L
 *
 * where M and L are the certified meridian and longitude
 * translations in the developed Euclidean cusp.
 */
export function m129PeripheralCoordinates(
  cuspIndex,
  point
) {
  const translation =
    translationForCusp(
      cuspIndex
    );

  const mx =
    Number(
      translation.meridian.re
    );

  const my =
    Number(
      translation.meridian.im
    );

  const lx =
    Number(
      translation.longitude.re
    );

  const ly =
    Number(
      translation.longitude.im
    );

  const x =
    Number(
      point.re
    );

  const y =
    Number(
      point.im
    );

  const determinant =
    mx * ly -
    my * lx;

  if (
    Math.abs(determinant) <
    1e-12
  ) {
    throw new Error(
      `Degenerate peripheral basis for cusp ${cuspIndex}.`
    );
  }

  return {
    meridian:
      (
        x * ly -
        y * lx
      ) /
      determinant,

    longitude:
      (
        mx * y -
        my * x
      ) /
      determinant,
  };
}


/*
 * Same material contract as m004:
 *
 *   longitude -> route around centerline
 *   meridian  -> angle around tube
 */
export function m129TubeCoordinates(
  cuspIndex,
  point
) {
  const {
    meridian,
    longitude,
  } =
    m129PeripheralCoordinates(
      cuspIndex,
      point
    );

  return {
    meridian,
    longitude,

    routeAmount:
      longitude,

    minorAmount:
      meridian,

    minorAngle:
      2 *
      Math.PI *
      meridian,
  };
}


const boundaryTubeCache =
  new Map();


export function m129BoundaryTubes({
  lambda =
    DEFAULT_M129_S3_LAMBDA,
  epsilon =
    DEFAULT_M129_S3_EPSILON,
  rho = M129_BOUNDARY_RHO,
  nu = M129_BOUNDARY_NU,
  nv = M129_BOUNDARY_NV,
} = {}) {
  const key =
    `${Number(lambda)}:` +
    `${Number(epsilon)}:` +
    `${Number(rho)}:` +
    `${Number(nu)}:` +
    `${Number(nv)}`;

  if (
    !boundaryTubeCache.has(
      key
    )
  ) {
    boundaryTubeCache.set(
      key,
      [0, 1].map(
        (cuspIndex) =>
          buildS3Tube({
            centerlinePoint:
              (t) =>
                m129S3CenterlinePoint(
                  cuspIndex,
                  t,
                  {
                    lambda:
                      Number(lambda),

                    epsilon:
                      Number(epsilon),
                  }
                ),

            nu:
              Number(nu),

            nv:
              Number(nv),

            rho:
              Number(rho),
          })
      )
    );
  }

  return boundaryTubeCache.get(
    key
  );
}


export function m129BoundaryPoint4(
  cuspIndex,
  point,
  tubeOptions = {}
) {
  const coordinates =
    m129TubeCoordinates(
      cuspIndex,
      point
    );

  const tube =
    m129BoundaryTubes(
      tubeOptions
    )[
      cuspIndex
    ];

  if (!tube) {
    throw new Error(
      `Unknown m129 cusp ${cuspIndex}.`
    );
  }

  return sampleS3TubePoint4(
    tube,
    coordinates.routeAmount,
    coordinates.minorAmount
  );
}


export function m129BoundaryTriangles4(
  tubeOptions = {}
) {
  return (
    M129_CUSP_TRIANGLES
      .triangles
      .map(
        (triangle) => ({
          id:
            triangle.id,

          cusp:
            triangle.cusp,

          tetrahedron:
            triangle.tetrahedron,

          idealVertex:
            triangle.ideal_vertex,

          oppositeFace:
            triangle.opposite_face,

          materialId:
            triangle.material_id,

          developedPoints:
            triangle.points.map(
              (point) => ({
                re:
                  Number(
                    point.re
                  ),

                im:
                  Number(
                    point.im
                  ),
              })
            ),

          points4:
            triangle.points.map(
              (point) =>
                m129BoundaryPoint4(
                  triangle.cusp,
                  point,
                  tubeOptions
                )
            ),
        })
      )
  );
}


export function m129CertifiedCuspTranslations() {
  return (
    M129_CUSP_TRIANGLES
      .cusp_translations
      .map(
        (record) => ({
          cusp:
            record.cusp,

          meridian: {
            re:
              Number(
                record.meridian.re
              ),

            im:
              Number(
                record.meridian.im
              ),
          },

          longitude: {
            re:
              Number(
                record.longitude.re
              ),

            im:
              Number(
                record.longitude.im
              ),
          },
        })
      )
  );
}
