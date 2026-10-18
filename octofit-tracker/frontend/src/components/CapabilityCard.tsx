import { useEffect, useState, type ReactNode } from 'react';

type Props = { title: string; description: string };
type DataProps<T> = Props & {
  emptyMessage: string;
  load: () => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, emptyMessage, load, renderItem }: DataProps<T>) {
  const [items, setItems] = useState<T[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    load().then((result) => {
      if (mounted) setItems(result);
    }).catch((reason: unknown) => {
      if (mounted) setError(reason instanceof Error ? reason.message : 'An unexpected error occurred.');
    });

    return () => {
      mounted = false;
    };
  }, [load]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {items === undefined && !error && <p role="status">Loading {title.toLowerCase()}...</p>}
    {error && <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>}
    {items && items.length === 0 && <p>{emptyMessage}</p>}
    {items && items.length > 0 && <ul className="list-group">{items.map((item, index) => <li className="list-group-item" key={index}>{renderItem(item)}</li>)}</ul>}
  </div></section>;
}
