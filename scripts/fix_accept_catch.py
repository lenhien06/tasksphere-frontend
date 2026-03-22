"""Fix accept/decline catch blocks without embedding Vietnamese literals."""
import re
from pathlib import Path

p = Path("app/invites/accept/page.tsx")
t = p.read_text(encoding="utf-8")

accept_re = re.compile(
    r"(\s+)else if \(statusCode === 409\) \{\s*"
    r"toast\.error\([^;]+\);\s*"
    r'setStatus\("error"\);\s*'
    r'setMessage\([^;]+\);\s*'
    r"\} else \{\s*"
    r'setStatus\("error"\);\s*'
    r"setMessage\(error\.response\?\.data\?\.meta\?\.message \|\| t\('invite\.acceptError'\)\);\s*"
    r"\}",
    re.MULTILINE,
)

accept_new = r"""\1else if (statusCode === 409 || errCode === "ALREADY_MEMBER") {
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

t2, n = accept_re.subn(accept_new, t, count=1)
if n != 1:
    raise SystemExit(f"accept replace count={n}")

# EMAIL_MISMATCH setMessage in accept — add getBeErrorMessage wrapper
t2 = t2.replace(
    "            if (statusCode === 400 && errorData?.error === \"EMAIL_MISMATCH\") {\n"
    "                setStatus(\"mismatch\");\n"
    "                setMessage(`Tài khoản đang đăng nhập (${currentUserEmail}) không khớp với email được mời (${inviteData?.inviteeEmail || 'email khác'}). Vui lòng đăng xuất và đăng nhập bằng đúng tài khoản.`);",
    "            if (statusCode === 400 && errorData?.error === \"EMAIL_MISMATCH\") {\n"
    "                setStatus(\"mismatch\");\n"
    "                setMessage(\n"
    "                    getBeErrorMessage(error) ||\n"
    "                        `Tài khoản đang đăng nhập (${currentUserEmail}) không khớp với email được mời (${inviteData?.inviteeEmail || \"email khác\"}). Vui lòng đăng xuất và đăng nhập bằng đúng tài khoản.`\n"
    "                );",
    1,
)

decline_re = re.compile(
    r"(        \} catch \(error: any\) \{\s*"
    r"const statusCode = error\?\.response\?\.status;\s*"
    r"const errorData = error\?\.response\?\.data;\s*"
    r")(if \(statusCode === 403 && errorData\?\.error === 'EMAIL_MISMATCH'\) \{.*?"
    r"\} else if \(statusCode === 409\) \{.*?"
    r"\} else if \(statusCode === 410\) \{.*?"
    r"\} else \{.*?"
    r"setMessage\(error\.response\?\.data\?\.meta\?\.message \|\| t\('invite\.declineError'\)\);\s*"
    r"\}\s*"
    r"\})",
    re.DOTALL,
)

decline_new = r"""\1const errCodeDecl = getStructuredErrorCode(error);

            if (statusCode === 403 && errorData?.error === "EMAIL_MISMATCH") {
                toast.error(getBeErrorMessage(error) || "Tài khoản đang đăng nhập không khớp với email được mời.");
                setStatus("mismatch");
                setMessage(
                    getBeErrorMessage(error) ||
                        `Tài khoản đang đăng nhập (${currentUserEmail}) không khớp với email được mời (${inviteData?.inviteeEmail || "email khác"}). Vui lòng đăng xuất và đăng nhập bằng đúng tài khoản.`
                );
            } else if (statusCode === 409 || errCodeDecl === "ALREADY_ACCEPTED") {
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
            }
        }"""

t3, nd = decline_re.subn(decline_new, t2, count=1)
if nd != 1:
    raise SystemExit(f"decline replace count={nd}")

p.write_text(t3, encoding="utf-8")
print("ok")
