/**
 * The Image picker port: the system's way of choosing image files. The app
 * adapter offers the camera and the library; a suite answers whatever files it
 * needs to. The port knows nothing of kinds, because choosing the stage is
 * choosing the kind: the caller attaches what came back to the active stage.
 */

/** What one trip to the picker produced. */
export type ImagePickResult =
  { kind: "picked"; sourcePaths: readonly string[] } | { kind: "cancelled" } | { kind: "denied" };

export interface ImagePicker {
  /**
   * Opens the picker and answers what happened: the files the owner picked, the
   * fact they backed out, or a permission the system refused. A denial is not a
   * cancel, because only one of them is worth telling the owner about.
   */
  pick(): Promise<ImagePickResult>;
}
