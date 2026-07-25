import { FfmpegFrameEncoder } from "./ffmpeg-frame-encoder.js";

export class WebpFrameEncoder extends FfmpegFrameEncoder {
  protected buildArgs(inputPattern: string): string[] {
    return [
      "-y",
      "-framerate",
      String(this.fps),
      "-i",
      inputPattern,
      "-loop",
      "0", // infinite loop
      "-lossless",
      "0",
      "-quality",
      "80",
      "-vsync",
      "0",
      this.outputPath,
    ];
  }
}
