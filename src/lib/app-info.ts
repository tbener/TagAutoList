import pkg from "../../package.json";

/** The single source of truth is `version` in package.json. */
export const APP_VERSION: string = pkg.version;

export const APP_NAME = "TagAutoList";
export const APP_TAGLINE = "Everything is a tag. Simple lists on top.";

/** Credits and contact — change them here. */
export const CREDITS = {
  author: "Tal Bener",
  feedbackEmail: "tbener@gmail.com",
};
