type SearchBarProps = {
  onChange: (value: string) => void;
  onClear: () => void;
  query: string;
};

export function SearchBar({ onChange, onClear, query }: SearchBarProps) {
  return (
    <div className="searchbar">
      <input
        aria-label="Search records"
        placeholder="Search by name, description, or status"
        value={query}
        onChange={(event) => onChange(event.target.value)}
      />
      <button className="button button--secondary" onClick={onClear} type="button">
        Clear
      </button>
    </div>
  );
}
