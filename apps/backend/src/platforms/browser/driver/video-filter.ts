/** ffmpeg -filter:v chain for browser mission video finalize. */
export function buildVideoFilterChain(args: {
  speed: number;
  trimIdle: boolean;
}): string {
  const parts: string[] = [];
  if (args.trimIdle) {
    parts.push("mpdecimate=hi=64*12:lo=64*5:frac=0.33");
  }
  if (args.speed !== 1) {
    const factor = 1 / args.speed;
    parts.push(`setpts=${factor}*PTS`);
  }
  return parts.join(",");
}
