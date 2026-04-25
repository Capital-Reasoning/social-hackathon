type DemoCoordinate = {
  latitude: number;
  longitude: number;
};

const streetAnchors: Array<{
  latitude: number;
  longitude: number;
  pattern: RegExp;
}> = [
  { pattern: /\bmenzies\b/i, latitude: 48.4159, longitude: -123.3719 },
  { pattern: /\bmichigan\b/i, latitude: 48.4153, longitude: -123.377 },
  { pattern: /\bpembroke\b/i, latitude: 48.4301, longitude: -123.3531 },
  { pattern: /\bgladstone\b/i, latitude: 48.4277, longitude: -123.3519 },
  { pattern: /\bmason\b/i, latitude: 48.4319, longitude: -123.3594 },
  { pattern: /\bcaledonia\b/i, latitude: 48.4308, longitude: -123.363 },
  { pattern: /\byates\b/i, latitude: 48.4262, longitude: -123.3616 },
  { pattern: /\bview\b/i, latitude: 48.4238, longitude: -123.3635 },
  { pattern: /\boscar\b/i, latitude: 48.4123, longitude: -123.3535 },
  { pattern: /\bcook\b/i, latitude: 48.4158, longitude: -123.3553 },
  { pattern: /\bhaultain\b/i, latitude: 48.4382, longitude: -123.3469 },
  { pattern: /\bcedar hill\b/i, latitude: 48.4411, longitude: -123.3407 },
  { pattern: /\bmoss\b/i, latitude: 48.4175, longitude: -123.348 },
  { pattern: /\blinden\b/i, latitude: 48.4189, longitude: -123.3444 },
  { pattern: /\bfort\b/i, latitude: 48.4234, longitude: -123.344 },
  { pattern: /\brichardson\b/i, latitude: 48.4195, longitude: -123.3405 },
  { pattern: /\bjutland\b/i, latitude: 48.4383, longitude: -123.3744 },
  { pattern: /\bgorge road east\b/i, latitude: 48.4392, longitude: -123.381 },
  { pattern: /\besquimalt\b/i, latitude: 48.4318, longitude: -123.397 },
  { pattern: /\btyee\b/i, latitude: 48.4333, longitude: -123.382 },
  { pattern: /\bquadra\b/i, latitude: 48.4388, longitude: -123.3593 },
  { pattern: /\bkings\b/i, latitude: 48.4386, longitude: -123.3655 },
  { pattern: /\bjohnson\b/i, latitude: 48.4282, longitude: -123.3651 },
  { pattern: /\bpandora\b/i, latitude: 48.4286, longitude: -123.3591 },
  { pattern: /\bshelbourne\b/i, latitude: 48.4442, longitude: -123.3339 },
  { pattern: /\bbay\b/i, latitude: 48.437, longitude: -123.3579 },
  { pattern: /\bfoul bay\b/i, latitude: 48.4237, longitude: -123.3265 },
  { pattern: /\bfinlayson\b/i, latitude: 48.4433, longitude: -123.3525 },
  {
    pattern: /\bburnside road west\b/i,
    latitude: 48.4573,
    longitude: -123.396,
  },
  { pattern: /\bfairfield\b/i, latitude: 48.4147, longitude: -123.3378 },
];

function hashText(value: string) {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function addressOffset(value: string) {
  const hash = hashText(value);
  const latitudeOffset = (((hash % 1000) - 500) / 1000) * 0.0048;
  const longitudeOffset =
    (((Math.floor(hash / 1000) % 1000) - 500) / 1000) * 0.0062;

  return {
    latitudeOffset,
    longitudeOffset,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function geocodeDemoVictoriaAddress({
  addressLine1,
  municipality,
}: {
  addressLine1: string;
  municipality?: string | null;
}): DemoCoordinate {
  const address = `${addressLine1}, ${municipality ?? "Victoria"}`;
  const anchor =
    streetAnchors.find((entry) => entry.pattern.test(addressLine1)) ?? null;
  const offset = addressOffset(address.toLowerCase());

  if (anchor) {
    return {
      latitude: Number(
        clamp(anchor.latitude + offset.latitudeOffset, 48.407, 48.462).toFixed(
          6
        )
      ),
      longitude: Number(
        clamp(
          anchor.longitude + offset.longitudeOffset,
          -123.407,
          -123.318
        ).toFixed(6)
      ),
    };
  }

  const hash = hashText(address.toLowerCase());
  const latitude = 48.414 + (hash % 3900) / 100_000;
  const longitude = -123.397 + (Math.floor(hash / 3900) % 7600) / 100_000;

  return {
    latitude: Number(clamp(latitude, 48.407, 48.462).toFixed(6)),
    longitude: Number(clamp(longitude, -123.407, -123.318).toFixed(6)),
  };
}
