import { FfmpegFrameEncoder } from "./ffmpeg-frame-encoder.js";

export class Mp4FrameEncoder extends FfmpegFrameEncoder {
  protected buildArgs(inputPattern: string): string[] {
    return [
      "-y",
      "-framerate",
      String(this.fps),
      "-i",
      inputPattern,
      "-vf",
      // Even width/height required by yuv420p; pixel-art dims (tiles * tile size) can land odd.
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      this.outputPath,
    ];
  }
}
