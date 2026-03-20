import * as emailLib from "@/lib/email";

describe("email module", () => {
  it("exports required functions", () => {
    expect(typeof emailLib.sendApprovalEmail).toBe("function");
    expect(typeof emailLib.sendRejectionEmail).toBe("function");
    expect(typeof emailLib.sendPendingNotificationEmail).toBe("function");
    expect(typeof emailLib.sendVerificationEmail).toBe("function");
    expect(typeof emailLib.sendPasswordResetEmail).toBe("function");
  });
});
