from pathlib import Path

p = Path("app/invites/accept/page.tsx")
t = p.read_text(encoding="utf-8")

accept_old = """            } else if (statusCode === 409) {
                toast.error('Lời mời này đã được chấp nhận trước đó.');
                setStatus("error");
                setMessage("Lời mời này đã được chấp nhận trước đó.");
            } else {
                setStatus("error");
                setMessage(error.response?.data?.meta?.message || t('invite.acceptError'));
            }"""

accept_new = """            } else if (statusCode === 409 || errCode === "ALREADY_MEMBER") {
                toast.error(getBeErrorMessage(error) || "Bạn đã là thành viên dự án hoặc lời mời đã được xử lý.");
                setStatus("error");
                setMessage(getBeErrorMessage(error) || "Không thể chấp nhận lời mời này.");
            } else if (statusCode === 410 || errCode === "TOKEN_EXPIRED_OR_REVOKED") {
                setStatus("error");
                setMessage(getBeErrorMessage(error) || "Lời mời đã hết hạn hoặc không còn hiệu lực.");
            } else if (statusCode === 404 || errCode === "TOKEN_NOT_FOUND") {
                setStatus("error");
                setMessage(getBeErrorMessage(error) || "Không tìm thấy lời mời.");
            } else {
                setStatus("error");
                setMessage(getBeErrorMessage(error) || t("invite.acceptError"));
            }"""

decline_old = """            } else if (statusCode === 409) {
                toast.error('Lời mời này đã được chấp nhận trước đó.');
                setStatus("error");
                setMessage("Lời mời này đã được chấp nhận trước đó.");
            } else if (statusCode === 410) {
                router.push(`/invites/accept?token=${token}`); // Re-verify
            } else {
                setStatus("error");
                setMessage(error.response?.data?.meta?.message || t('invite.declineError'));
            }"""

decline_new = """            } else if (statusCode === 409 || errCodeDecl === "ALREADY_ACCEPTED") {
                toast.error(getBeErrorMessage(error) || "Lời mời đã được chấp nhận trước đó.");
                setStatus("error");
                setMessage(getBeErrorMessage(error) || "Không thể từ chối lời mời này.");
            } else if (statusCode === 410 || errCodeDecl === "TOKEN_EXPIRED_OR_REVOKED") {
                setStatus("error");
                setMessage(getBeErrorMessage(error) || "Lời mời đã hết hạn hoặc không còn hiệu lực.");
            } else if (statusCode === 404 || errCodeDecl === "TOKEN_NOT_FOUND") {
                setStatus("error");
                setMessage(getBeErrorMessage(error) || "Không tìm thấy lời mời.");
            } else {
                setStatus("error");
                setMessage(getBeErrorMessage(error) || t("invite.declineError"));
            }"""

if accept_old not in t:
    i = t.find("} else if (statusCode === 409)")
    snippet = t[i : i + 500]
    Path("_debug_accept.txt").write_text(snippet, encoding="utf-8")
    raise SystemExit("accept_old not found — wrote _debug_accept.txt")
t = t.replace(accept_old, accept_new, 1)

if decline_old not in t:
    raise SystemExit("decline_old not found")
# Insert errCodeDecl in decline catch
t = t.replace(
    """        } catch (error: any) {
            const statusCode = error?.response?.status;
            const errorData = error?.response?.data;

            if (statusCode === 403 && errorData?.error === 'EMAIL_MISMATCH') {""",
    """        } catch (error: any) {
            const statusCode = error?.response?.status;
            const errCodeDecl = getStructuredErrorCode(error);
            const errorData = error?.response?.data;

            if (statusCode === 403 && errorData?.error === 'EMAIL_MISMATCH') {""",
    1,
)
t = t.replace(decline_old, decline_new, 1)

# Improve EMAIL_MISMATCH accept message
t = t.replace(
    """                setMessage(`Tài khoản đang đăng nhập (${currentUserEmail}) không khớp với email được mời (${inviteData?.inviteeEmail || 'email khác'}). Vui lòng đăng xuất và đăng nhập bằng đúng tài khoản.`);""",
    """                setMessage(
                    getBeErrorMessage(error) ||
                        `Tài khoản đang đăng nhập (${currentUserEmail}) không khớp với email được mời (${inviteData?.inviteeEmail || "email khác"}). Vui lòng đăng xuất và đăng nhập bằng đúng tài khoản.`
                );""",
    1,
)

p.write_text(t, encoding="utf-8")
print("patched")
