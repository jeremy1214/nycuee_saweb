import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="交大電機首頁">
      <span className="brand-mark" aria-hidden="true">EE</span>
      <span>
        <strong>交大電機</strong>
        <small>ELECTRICAL ENGINEERING · NYCU</small>
      </span>
    </Link>
  );
}
