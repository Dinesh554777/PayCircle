import { useState } from "react";
import { ScanLine, ImageIcon, Sparkles } from "lucide-react";
import Modal from "./common/Modal";
import Button from "./common/Button";
import Input from "./common/Input";
import Select from "./common/Select";
import Badge from "./common/Badge";
import { apiRequest } from "../api/client";
import { formatMoney } from "../utils/format";

const CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Healthcare",
  "Education",
  "Travel",
  "Rent",
  "Other",
];

export default function ReceiptModal({ open, onClose, onUseReceipt }) {
  const [receiptText, setReceiptText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [result, setResult] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");

  function reset() {
    setReceiptText("");
    setImageUrl("");
    setResult(null);
    setExtracting(false);
    setError("");
    setEditing(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Image is too large (max 3 MB). It's only used as a reference.");
      return;
    }
    setImageUrl(URL.createObjectURL(file));
    setError("");
  }

  async function handleExtract(event) {
    event.preventDefault();
    if (!receiptText.trim()) {
      setError("Paste or type the receipt text (amounts, date, store name).");
      return;
    }
    setError("");
    setExtracting(true);
    try {
      const data = await apiRequest("/ai/receipt/extract", {
        method: "POST",
        body: { text: receiptText },
        auth: true,
      });
      setResult(data);
      if (data.extracted) {
        setEditTitle(data.merchant || "Receipt expense");
        setEditAmount(String(data.amount ?? ""));
        setEditCategory(data.category || "");
        setEditDate(
          data.date ? new Date(data.date).toISOString().slice(0, 10) : ""
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  function handleUse() {
    if (editing) {
      if (!Number(editAmount) || Number(editAmount) <= 0) {
        setError("Amount must be greater than 0.");
        return;
      }
      onUseReceipt({
        title: editTitle.trim() || "Receipt expense",
        amount: editAmount,
        category: editCategory,
        expenseDate: editDate,
      });
    } else if (result?.extracted) {
      onUseReceipt({
        title: result.merchant || "Receipt expense",
        amount: String(result.amount ?? ""),
        category: result.category || "",
        expenseDate: result.date ? new Date(result.date).toISOString().slice(0, 10) : "",
      });
    }
    handleClose();
  }

  const dateInputValue = editing ? editDate : result?.date ? new Date(result.date).toISOString().slice(0, 10) : "";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Scan a Receipt"
      icon={ScanLine}
      size="lg"
      labelledBy="receipt-title"
    >
      {!result ? (
        <form onSubmit={handleExtract}>
          {imageUrl && (
            <div className="mb-3">
              <img
                src={imageUrl}
                alt="Receipt preview"
                className="receipt-preview"
              />
            </div>
          )}
          <div className="flex gap-2 items-center mb-3">
            <label className="btn btn-secondary btn-sm">
              <ImageIcon aria-hidden="true" /> {imageUrl ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImage}
              />
            </label>
            <span className="text-muted text-sm">
              Photo is for reference only (stays on your device).
            </span>
          </div>
          <Input
            label="Receipt text"
            name="receiptText"
            textarea
            rows={6}
            required
            value={receiptText}
            onChange={(e) => setReceiptText(e.target.value)}
            placeholder={"Cafe Coffee Day\n12 Aug 2026\nCoffee 120.00\nSandwich 180.00\nTOTAL 300.00"}
          />
          <p className="text-muted text-sm mb-3">
            Type or paste the store name, date, and item amounts. PayCircle will
            extract the total, merchant, date and category for you to review.
          </p>
          {error && <p className="form-error">{error}</p>}
          <div className="flex gap-2 items-center">
            <Button type="submit" loading={extracting} icon={Sparkles}>
              Extract info
            </Button>
            <Button variant="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </form>
      ) : result.extracted ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="success">Extracted</Badge>
            <span className="text-muted text-sm">
              {Math.round(Number(result.confidence || 0) * 100)}% confident · review before adding
            </span>
          </div>

          {editing ? (
            <div className="grid-2 gap-2">
              <Input
                label="Title"
                name="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Input
                label="Amount"
                name="editAmount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
              <Select
                label="Category"
                name="editCategory"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                placeholder="None"
              />
              <Input
                label="Date"
                name="editDate"
                type="date"
                value={dateInputValue}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          ) : (
            <ul className="member-list mb-3">
              <li className="member-row">
                <span className="text-secondary" style={{ width: 90 }}>Merchant</span>
                <span className="text-semibold">{result.merchant || "—"}</span>
              </li>
              <li className="member-row">
                <span className="text-secondary" style={{ width: 90 }}>Amount</span>
                <span className="text-semibold">{formatMoney(result.amount)}</span>
              </li>
              <li className="member-row">
                <span className="text-secondary" style={{ width: 90 }}>Date</span>
                <span className="text-semibold">
                  {result.date ? new Date(result.date).toLocaleDateString() : "—"}
                </span>
              </li>
              <li className="member-row">
                <span className="text-secondary" style={{ width: 90 }}>Category</span>
                <span className="text-semibold">{result.category || "Auto (AI)"}</span>
              </li>
            </ul>
          )}

          {result.notes && result.notes.length > 0 && (
            <p className="text-muted text-sm mb-3">
              {result.notes.join(" ")}
            </p>
          )}
          {error && <p className="form-error">{error}</p>}

          <div className="flex gap-2 items-center flex-wrap">
            <Button variant="primary" onClick={handleUse} icon={ScanLine}>
              {editing ? "Save & use expense" : "Use this expense"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setEditing((prev) => !prev)}
            >
              {editing ? "View extracted" : "Edit details"}
            </Button>
            <Button variant="ghost" onClick={() => setResult(null)}>
              Try another receipt
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="form-error">{result.error}</p>
          <p className="text-secondary text-sm">
            We couldn't read a clear amount from this receipt. Add the expense
            manually using the form — the receipt assistant is here to help, not
            to block you.
          </p>
          <div className="flex gap-2 items-center">
            <Button variant="primary" onClick={handleClose}>
              Enter manually
            </Button>
            <Button variant="ghost" onClick={() => setResult(null)}>
              Try again
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
