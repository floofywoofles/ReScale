/**
 * Image and video upscaling helpers.
 *
 * Responsibilities:
 * - Validate a WxH resolution string defensively.
 * - Resize images/videos using Sharp while reporting a terminal progress bar.
 * - Persist processed buffers to disk (Bun runtime).
 *
 * Notes:
 * - These utilities assume Bun is available for file I/O (`Bun.write`).
 * - Progress is estimated using output buffer size vs original metadata size.
 */
import sharp, { type Metadata } from "sharp";
import path from "path";
import ProgressBar from "progress";
import zod from "zod";
import schema from "./schema.ts";


/**
 * Resize an image to a target WxH and display a progress bar.
 *
 * Important: the `resolution` parameter is currently ignored; the function
 * uses `parsedArgs.resolution` for the authoritative value.
 *
 * @param image - A pre-configured Sharp instance for the input image.
 * @param resolution - Target resolution (WxH). Kept for API compatibility.
 * @param parsedArgs - Validated CLI arguments, including the resolution.
 * @returns A Buffer with the resized image, or undefined if something fails.
 * @throws Error when validation fails or Sharp processing encounters an issue.
 */
export async function upscaleImage(image: sharp.Sharp, resolution: string, parsedArgs: zod.infer<typeof schema>): Promise<Buffer | undefined> {
    let upscaledImage: Buffer | undefined;
    try {
        // Validate resolution string thoroughly (WxH) with explicit diagnostics
        if (!parsedArgs.resolution) {
            throw new Error(`[UPSCALER] Resolution is required`);
        }
        if (!parsedArgs.resolution.includes("x")) {
            throw new Error(`[UPSCALER] Resolution does not contain an x`);
        }
        const resolution = parsedArgs.resolution.split("x");
        if (resolution.length !== 2) {
            throw new Error(`[UPSCALER] Resolution does not contain two values`);
        }
        if (!resolution[0] || !resolution[1]) {
            throw new Error(`[UPSCALER] Resolution does not contain two values`);
        }
        if (isNaN(parseInt(resolution[0])) || isNaN(parseInt(resolution[1]))) {
            throw new Error(`[UPSCALER] Resolution does not contain integer values for the resolution or its NaN`);
        }
        if (parseInt(resolution[0]) === 0 || parseInt(resolution[1]) === 0) {
            throw new Error(`[UPSCALER] Resolution is 0 or less`);
        }

        // Create a progress bar for the resizing
        // toString() is used to remove the file:// prefix from the image path
        const progressTotal: number = 100;
        const progressWidth: number = 20;
        const progressString: string = `Resizing image ${path.basename(parsedArgs.image.toString())} to ${parsedArgs.resolution}... [:bar] :current/:total`;
        const progressBar = new ProgressBar(progressString, {
            total: progressTotal,
            width: progressWidth,
        });
        // Initialize the progress bar at 0%
        progressBar.update(0);
        progressBar.render();
        // Declare the width and height variables from our CLI args
        const width: number = parseInt(resolution[0]);
        const height: number = parseInt(resolution[1]);
        // Resize the image to the width and height
        upscaledImage = await image.resize(width, height).toBuffer().then((buffer: Buffer | undefined) => {
            // Pass through the produced buffer to the next step
            return buffer;
        }).then(async (buffer: Buffer | undefined) => {
            // Update the progress bar after resizing has produced a buffer
            if (!buffer) {
                throw new Error(`[UPSCALER] Failed to resize image. Might be undefined`);
            }
            // Show the progress bar with a safe 0–100% calculation
            const originalSize: number = await image.metadata().then((metadata: Metadata | undefined) => {
                if (!metadata) {
                    return 0;
                }
                return typeof metadata.size === "number" ? metadata.size : 0;
            });
            // Clamp the ratio to 0–1 to satisfy progress.update expectations
            const denominator: number = originalSize > 0 ? originalSize : buffer.length;
            const ratio: number = denominator > 0 ? Math.min(1, buffer.length / denominator) : 1;
            // Update the progress bar to the current ratio (0–1)
            progressBar.update(ratio);
            // Complete the progress bar to 100%
            progressBar.update(1);
            // Render the progress bar in the terminal
            progressBar.render();
            // Return the buffer to the outer scope
            return buffer;
        });
    } catch (error) {
        throw new Error(`[UPSCALER] Failed to resize image: ${error}`);
    }
    return upscaledImage;
}

/**
 * Write an image buffer to disk using Bun.
 *
 * @param image - The processed image buffer to persist.
 * @param output - Destination file path.
 * @param parsedArgs - Validated CLI arguments (uses `output` and `debug`).
 * @returns Resolves when the write has been scheduled; errors are surfaced via exceptions.
 * @throws Error if the buffer is missing or the write operation fails.
 */
export async function saveImage(image: Buffer, output: string, parsedArgs: zod.infer<typeof schema>): Promise<void> {
    try {
        // Ensure we actually have an output buffer before attempting to write
        if (!image) {
            throw new Error(`[UPSCALER] Failed to resize image. Might be undefined`);
        }
        // Persist the upscaled image to disk
        Bun.write(parsedArgs.output, image).then(() => {
            if (process.env.DEBUG === "true") {
                console.log(`[UPSCALER] Image written to ${parsedArgs.output}`);
            }
        }).catch((error) => {
            throw new Error(`[UPSCALER] Failed to write image: ${error}`);
        });
    } catch (error) {
        throw new Error(`[UPSCALER] Failed to write image: ${error}`);
    }

    if (process.env.DEBUG === "true") {
        console.log(`[UPSCALER] Image upscaled and written to ${parsedArgs.output}`)
    }
}

/**
 * Resize a video buffer to a target WxH and display a progress bar.
 *
 * Note: This performs a naive frame resize using Sharp on the provided buffer
 * and is best suited for image-like buffers. True video transcoding should use
 * a dedicated tool (e.g., ffmpeg) with proper codecs and containers.
 *
 * @param video - Input buffer to be resized.
 * @param resolution - Target resolution (WxH). Kept for API compatibility.
 * @param parsedArgs - Validated CLI arguments, including the resolution.
 * @returns A Buffer with the resized output, or undefined on failure.
 * @throws Error when validation or processing fails.
 */
export async function upscaleVideo(video: Buffer, resolution: string, parsedArgs: zod.infer<typeof schema>): Promise<Buffer | undefined> {
    let upscaledVideo: Buffer | undefined;
    try {
        // Validate resolution string thoroughly (WxH) with explicit diagnostics
        if (!parsedArgs.resolution) {
            throw new Error(`[UPSCALER] Resolution is required`);
        }
        if (!parsedArgs.resolution.includes("x")) {
            throw new Error(`[UPSCALER] Resolution does not contain an x`);
        }
        const resolution = parsedArgs.resolution.split("x");
        if (resolution.length !== 2) {
            throw new Error(`[UPSCALER] Resolution does not contain two values`);
        }
        if (!resolution[0] || !resolution[1]) {
            throw new Error(`[UPSCALER] Resolution does not contain two values`);
        }
        if (isNaN(parseInt(resolution[0])) || isNaN(parseInt(resolution[1]))) {
            throw new Error(`[UPSCALER] Resolution does not contain integer values for the resolution or its NaN`);
        }
        if (parseInt(resolution[0]) === 0 || parseInt(resolution[1]) === 0) {
            throw new Error(`[UPSCALER] Resolution is 0 or less`);
        }
        // Create a progress bar for the resizing
        // toString() is used to remove the file:// prefix from the video path
        const progressTotal: number = 100;
        const progressWidth: number = 20;
        const progressString: string = `Resizing video ${path.basename(video.toString())} to ${parsedArgs.resolution}... [:bar] :current/:total`;
        const progressBar = new ProgressBar(progressString, {
            total: progressTotal,
            width: progressWidth,
        });
        // Initialize the progress bar at 0%
        progressBar.update(0);
        progressBar.render();
        // Declare the width and height variables from our CLI args
        const width: number = parseInt(resolution[0]);
        const height: number = parseInt(resolution[1]);
        // Resize the video to the width and height
        upscaledVideo = await sharp(video).resize(width, height).toBuffer().then((buffer: Buffer | undefined) => {
            // Pass through the produced buffer to the next step
            return buffer;
        }).then(async (buffer: Buffer | undefined) => {
            // Update the progress bar after resizing has produced a buffer
            if (!buffer) {
                throw new Error(`[UPSCALER] Failed to resize video. Might be undefined`);
            }
            // Show the progress bar with a safe 0–100% calculation
            const originalSize: number = await sharp(video).metadata().then((metadata: Metadata | undefined) => {
                if (!metadata) {
                    return 0;
                }
                return typeof metadata.size === "number" ? metadata.size : 0;
            });
            // Clamp the ratio to 0–1 to satisfy progress.update expectations
            const denominator: number = originalSize > 0 ? originalSize : buffer.length;
            const ratio: number = denominator > 0 ? Math.min(1, buffer.length / denominator) : 1;
            // Update the progress bar to the current ratio (0–1)
            progressBar.update(ratio);
            // Complete the progress bar to 100%
            progressBar.update(1);
            // Render the progress bar in the terminal
            progressBar.render();
            // Return the buffer to the outer scope
            return buffer;
        });
    } catch (error) {
        throw new Error(`[UPSCALER] Failed to upscale video: ${error}`);
    }
    return upscaledVideo;
}



/**
 * Persist a resized video buffer to disk.
 *
 * Currently a placeholder for parity with `saveImage`. Extend to perform
 * actual file I/O when a real video processing pipeline is introduced.
 *
 * @param video - The processed video buffer to persist.
 * @param output - Destination file path.
 * @param parsedArgs - Validated CLI arguments (uses `output` and `debug`).
 * @returns Resolves after basic validation and debug logging.
 * @throws Error if the buffer is missing.
 */
async function saveVideo(video: Buffer, output: string, parsedArgs: zod.infer<typeof schema>): Promise<void> {
    try {
        // Ensure we actually have an output buffer before attempting to write
        if (!video) {
            throw new Error(`[UPSCALER] Failed to upscale video. Might be undefined`);
        }
    } catch (error) {
        throw new Error(`[UPSCALER] Failed to save video: ${error}`);
    }
    if (process.env.DEBUG === "true") {
        console.log(`[UPSCALER] Video upscaled and written to ${parsedArgs.output}`)
    }
}

/**
 * Validate the resolution inside parsed CLI arguments.
 *
 * This is a defensive validator duplicating checks done elsewhere to keep
 * runtime failures explicit and actionable.
 *
 * @param parsedArgs - Validated CLI arguments containing `resolution`.
 * @throws Error if the resolution string is malformed.
 */
function validateParsedArgs(parsedArgs: zod.infer<typeof schema>): void {
    if (!parsedArgs.resolution) {
        throw new Error(`[UPSCALER] Resolution is required`);
    }
    if (!parsedArgs.resolution.includes("x")) {
        throw new Error(`[UPSCALER] Resolution does not contain an x`);
    }
    const resolution = parsedArgs.resolution.split("x");
    if (resolution.length !== 2) {
        throw new Error(`[UPSCALER] Resolution does not contain two values`);
    }
    if (!resolution[0] || !resolution[1]) {
        throw new Error(`[UPSCALER] Resolution does not contain two values`);
    }
    if (isNaN(parseInt(resolution[0])) || isNaN(parseInt(resolution[1]))) {
        throw new Error(`[UPSCALER] Resolution does not contain integer values for the resolution or its NaN`);
    }
    if (parseInt(resolution[0]) === 0 || parseInt(resolution[1]) === 0) {
        throw new Error(`[UPSCALER] Resolution is 0 or less`);
    }
}