import { Link } from "react-router-dom";

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="交大電機首頁">
      <img className="brand-mark" src={`${import.meta.env.BASE_URL}nycu-ee-logo.png`} alt="交大電機圖標" />
      <span>
        <strong>交大電機</strong>
        <small>ELECTRICAL ENGINEERING · NYCU</small>
      </span>
    </Link>
  );
}
