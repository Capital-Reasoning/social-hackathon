type RouteDirectionStep = {
  distanceMeters: number;
};

const turnInstructionLookaheadMeters = 500;
const initialInstructionHoldMeters = 30;
const continueStraightInstruction = "Continue straight";

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
      const distanceToNextStep = Math.max(nextWalked - distanceAlongLine, 0);
      const hasClearedInitialInstruction =
        index === 0 && distanceAlongLine >= initialInstructionHoldMeters;
      const isPastLaterManeuver = index > 0 && distanceAlongLine > walked;
      const shouldShowNextManeuver =
        !isFinalStep && distanceToNextStep <= turnInstructionLookaheadMeters;

      if (shouldShowNextManeuver) {
        return {
          remainingMeters: distanceToNextStep,
          stepIndex: nextStepIndex,
        };
      }

      if (
        !isFinalStep &&
        (hasClearedInitialInstruction || isPastLaterManeuver)
      ) {
        return {
          instruction: continueStraightInstruction,
          remainingMeters: distanceToNextStep,
          stepIndex: index,
        };
      }

      return {
        remainingMeters: distanceToNextStep,
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
