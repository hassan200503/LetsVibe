/**
 * Server clock estimation for media rooms.
 *
 * A phone and the server disagree about "now" by anywhere from milliseconds to
 * hours. Every poll is a round trip: the client records when it sent and when
 * the reply arrived, and the server stamps its own clock. The midpoint of the
 * round trip is the best estimate of when the server read its clock, so
 *
 *   offset = serverTime - midpoint
 *
 * The fastest recent round trip is chosen rather than an average, because the
 * minimum delay is the sample least distorted by queueing on either end. With
 * twelve samples a bad tail — a tunnel, a sleeping radio — cannot drag the
 * estimate away from the truth.
 */
export type ClockSample = {
  /** Client clock when the request left. */
  sentClientMs: number;
  /** Client clock when the reply arrived. */
  receivedClientMs: number;
  /** Server clock stamped when the server handled the request. */
  serverTimeMs: number;
};

export type ClockEstimate = {
  /** Add this to a client clock to get the server clock. */
  offsetMs: number;
  /** Round-trip time of the chosen sample. `Infinity` before any sample. */
  rttMs: number;
  samples: number;
};

export const NO_CLOCK: ClockEstimate = { offsetMs: 0, rttMs: Infinity, samples: 0 };

export function clockOffset(sample: ClockSample): number {
  return sample.serverTimeMs - (sample.sentClientMs + sample.receivedClientMs) / 2;
}

export function clockRtt(sample: ClockSample): number {
  return Math.max(0, sample.receivedClientMs - sample.sentClientMs);
}

/** The least-delayed sample wins; ties keep the earlier sample for stability. */
export function estimateClock(samples: readonly ClockSample[]): ClockEstimate {
  if (!samples.length) return NO_CLOCK;
  let best = samples[0];
  let bestRtt = clockRtt(best);
  for (let i = 1; i < samples.length; i += 1) {
    const rtt = clockRtt(samples[i]);
    if (rtt < bestRtt) {
      best = samples[i];
      bestRtt = rtt;
    }
  }
  return { offsetMs: clockOffset(best), rttMs: bestRtt, samples: samples.length };
}

/** Keeps the last `limit` samples, oldest dropped first. */
export function addSample(samples: readonly ClockSample[], sample: ClockSample, limit = 12): ClockSample[] {
  return [...samples, sample].slice(-limit);
}

/** The server clock at this client instant. */
export function serverNow(clientNowMs: number, offsetMs: number): number {
  return clientNowMs + offsetMs;
}
