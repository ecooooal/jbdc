/**
 * The Image picker port: the system's way of choosing image files. The app
 * adapter offers the camera and the library; a suite answers whatever files it
 * needs to. The port knows nothing of kinds, because choosing the stage is
 * choosing the kind: the caller attaches what came back to the active stage.
 */
export interface ImagePicker {
  /**
   * Opens the picker and answers the files the owner picked, as source paths.
   * Empty when they backed out or granted no permission.
   */
  pick(): Promise<readonly string[]>;
}
