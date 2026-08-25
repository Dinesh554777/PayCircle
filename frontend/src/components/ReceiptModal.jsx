import { useRef, useState } from "react";
import {
  ScanLine,
  ImageIcon,
  Sparkles,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import Modal from "./common/Modal";
import Button from "./common/Button";
import Input from "./common/Input";
import Badge from "./common/Badge";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const RECEIPT_PLACEHOLDER =
  "Receipt information will appear here automatically after scanning...";

export default function ReceiptModal({ open, onClose, onUseReceipt }) {
  const [receiptText, setReceiptText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [scanError, setScanError] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const objectUrlRef = useRef("");

  function reset() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
    setReceiptText("");
    setImageUrl("");
    setFile(null);
    setStatus("idle");
    setScanError("");
    setError("");
    setResult(null);
    setManualMode(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function analyze(selectedFile) {
    setStatus("analyzing");
    setScanError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("image", selectedFile);
      const data = await apiRequest("/ai/receipt/scan", {
        method: "POST",
        body: form,
        auth: true,
      });
      if (!data.extracted) {
        setScanError(
          data.error || "We couldn't read this receipt. Try uploading a clearer image."
        );
        setStatus("error");
        return;
      }
      setResult(data);
      setReceiptText(data.raw_text || "");
      setStatus("success");
    } catch (err) {
      setScanError(err.message || "We couldn't read this receipt. Please try again.");
      setStatus("error");
    }
  }

  function handleImage(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError("");
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setScanError("Unsupported file. Please upload a JPG, PNG or WEBP image.");
      setStatus("error");
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setScanError("Image is too large. Maximum size is 8 MB.");
      setStatus("error");
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(selected);
    objectUrlRef.current = url;
    setImageUrl(url);
    setFile(selected);
    setManualMode(false);
    analyze(selected);
  }

  function retry() {
    if (file) analyze(file);
    else setStatus("idle");
  }

  function startManualMode() {
    setManualMode(true);
    setStatus("idle");
    setScanError("");
  }

  async function handleExtract(event) {
    event.preventDefault();
    if (!receiptText.trim()) {
      setError("Paste or type the receipt text (amounts, date, store name).");
      return;
    }
    setError("");
    setStatus("analyzing");
    try {
      const data = await apiRequest("/ai/receipt/extract", {
        method: "POST",
        body: { text: receiptText },
        auth: true,
      });
      if (!data.extracted) {
        setError(data.error || "Could not read an amount from this text.");
        return;
      }
      setResult(data);
      setReceiptText(data.raw_text || "");
      setStatus("success");
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus("idle");
    }
  }

  function handleUse() {
    if (!result?.extracted) return;
    onUseReceipt({
      title: result.merchant || "Receipt expense",
      amount: String(result.amount ?? result.total ?? ""),
      category: result.category || "",
      expenseDate: result.date ? new Date(result.date).toISOString().slice(0, 10) : "",
    });
    handleClose();
  }

  const analyzing = status === "analyzing";
  const extracted = status === "success" && result?.extracted;
  const itemCount = result?.items?.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Scan a Receipt"
      icon={ScanLine}
      size="lg"
      labelledBy="receipt-title"
    >
      <div className="flex gap-2 items-center mb-3 flex-wrap">
        <label className="btn btn-secondary btn-sm">
          <ImageIcon aria-hidden="true" /> {imageUrl ? "Change image" : "Upload receipt image"}
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={handleImage}
            disabled={analyzing}
          />
        </label>
        {!manualMode && !imageUrl && (
          <button
            type="button"
            className="link"
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
            onClick={startManualMode}
          >
            Can&apos;t scan? Enter receipt details manually
          </button>
        )}
      </div>

      {imageUrl && (
        <div className="mb-3">
          <img src={imageUrl} alt="Receipt preview" className="receipt-preview" />
        </div>
      )}

      {analyzing && (
        <div className="flex items-center gap-2 mb-3" role="status">
          <Loader2 className="spin" aria-hidden="true" />
          <div>
            <p className="text-semibold mb-0">🔍 Analyzing receipt...</p>
            <p className="text-muted text-sm mb-0">
              Extracting merchant, items, date and total
            </p>
          </div>
        </div>
      )}

      {status === "error" && scanError && (
        <div className="mb-3">
          <p className="form-error mb-2">{scanError}</p>
          <div className="flex gap-2 items-center flex-wrap">
            {file && (
              <Button variant="secondary" onClick={retry} icon={RefreshCw}>
                Try Again
              </Button>
            )}
            <Button variant="ghost" onClick={startManualMode}>
              Enter manually
            </Button>
          </div>
        </div>
      )}

      {extracted && (
        <>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <CheckCircle2 aria-hidden="true" color="var(--success)" />
            <span className="text-semibold text-success">
              ✓ Receipt analyzed successfully
            </span>
            <Badge variant="success">
              {Math.round(Number(result.confidence || 0) * 100)}% confident
            </Badge>
          </div>
          <ul className="member-list mb-3">
            <li className="member-row">
              <span className="text-secondary" style={{ width: 90 }}>Merchant</span>
              <span className="text-semibold">{result.merchant || "—"}</span>
            </li>
            <li className="member-row">
              <span className="text-secondary" style={{ width: 90 }}>Date</span>
              <span className="text-semibold">
                {result.date ? new Date(result.date).toLocaleDateString() : "—"}
              </span>
            </li>
            <li className="member-row">
              <span className="text-secondary" style={{ width: 90 }}>Items</span>
              <span className="text-semibold">
                {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
            </li>
            <li className="member-row">
              <span className="text-secondary" style={{ width: 90 }}>Total</span>
              <span className="text-semibold">
                {formatMoney(result.amount ?? result.total)}
                {result.currency ? ` · ${result.currency}` : ""}
              </span>
            </li>
          </ul>
        </>
      )}

      {(manualMode || imageUrl) && !analyzing && (
        <form onSubmit={handleExtract}>
          <Input
            label={extracted ? "Extracted receipt text" : "Receipt text"}
            name="receiptText"
            textarea
            rows={6}
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
            placeholder={RECEIPT_PLACEHOLDER}
            hint={
              manualMode
                ? undefined
                : "Review the scanned text — fix anything the scanner misread."
            }
          />
          <p className="text-muted text-sm mb-3">
            PayCircle reads the store name, date, items and totals from this text.
          </p>
          {error && <p className="form-error">{error}</p>}
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              type="submit"
              loading={analyzing}
              disabled={analyzing}
              icon={Sparkles}
            >
              {extracted && !manualMode ? "Re-extract" : "Extract info"}
            </Button>
            {extracted && (
              <Button variant="primary" onClick={handleUse} icon={ScanLine}>
                Use Receipt Data
              </Button>
            )}
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
