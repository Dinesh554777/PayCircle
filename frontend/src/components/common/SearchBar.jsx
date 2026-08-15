import { forwardRef, useId } from "react";
import { Search } from "lucide-react";

const SearchBar = forwardRef(function SearchBar(
  { placeholder = "Search...", value, onChange, onClear, className = "", ...props },
  ref
) {
  const id = useId();

  return (
    <div className="input-wrap" style={{ minWidth: 200 }}>
      <Search aria-hidden="true" />
      <input
        ref={ref}
        id={id}
        type="search"
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={placeholder}
        {...props}
      />
    </div>
  );
});

export default SearchBar;
