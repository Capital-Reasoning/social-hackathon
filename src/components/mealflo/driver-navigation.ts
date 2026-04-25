type RouteDirectionStep = {
  distanceMeters: number;
};

const instructionLookaheadMeters = 70;

export function getDirectionProgress(
  segmentDirections: readonly RouteDirectionStep[],
  distanceAlongLine: number
) {
  if (segmentDirections.length === 0) {
    return {
      remainingMeters: null,
      stepIndex: 0,
    };
  }

  let walked = 0;

  for (let index = 0; index < segmentDirections.length; index += 1) {
    const direction = segmentDirections[index]!;
    const stepDistance = Math.max(direction.distanceMeters, 0);
    const nextWalked = walked + stepDistance;
    const nextStepIndex = index + 1;
    const isFinalStep = index === segmentDirections.length - 1;

    if (distanceAlongLine <= nextWalked || isFinalStep) {
      if (
        !isFinalStep &&
        nextWalked - distanceAlongLine <= instructionLookaheadMeters
      ) {
        return {
          remainingMeters: Math.max(nextWalked - distanceAlongLine, 0),
          stepIndex: nextStepIndex,
        };
      }

      return {
        remainingMeters: Math.max(nextWalked - distanceAlongLine, 0),
        stepIndex: index,
      };
    }

    walked = nextWalked;
  }

  return {
    remainingMeters: 0,
    stepIndex: segmentDirections.length - 1,
  };
}
