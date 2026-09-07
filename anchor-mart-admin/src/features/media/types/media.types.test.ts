import { describe, expect, it } from "vitest";
import { FILE_LOCATIONS } from "./media.types";

describe("FILE_LOCATIONS", () => {
  it("keeps the trailing slash on every entry", () => {
    // `file_location` is compared against `FILE_DIR_CHOICES` by exact string
    // match, slash included — "notification_images" without it is a 400 that
    // surfaces as a failed upload, not as a validation message.
    for (const [name, dir] of Object.entries(FILE_LOCATIONS)) {
      expect(dir, name).toMatch(/^[a-z_]+\/$/);
    }
  });

  it("offers a directory for each image field wired to the picker", () => {
    expect(FILE_LOCATIONS.NOTIFICATION_IMAGES).toBe("notification_images/");
    expect(FILE_LOCATIONS.COUPON_IMAGES).toBe("coupon_images/");
    expect(FILE_LOCATIONS.CATEGORY_IMAGES).toBe("category_images/");
  });
});
