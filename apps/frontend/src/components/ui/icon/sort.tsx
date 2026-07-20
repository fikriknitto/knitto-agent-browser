import clsx from 'clsx';

export default function SortIcon({ sort = 'unset' }: TIconSort) {
  return (
    <div className="flex flex-col text-black-100 dark:text-greyish-semi-white">
      <SortUp sort={sort} />
      <SortDown sort={sort} />
    </div>
  );
}

function SortDown({ sort }: TIconSort) {
  return (
    <svg
      className={clsx('-mt-1', sort === 'desc' ? 'fill-current' : 'fill-black-40 dark:fill-black-40')}
      stroke="currentColor"
      strokeWidth="0"
      version="1.2"
      baseProfile="tiny"
      viewBox="0 0 24 24"
      height="10"
      width="10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5.8 9.7l6.2 6.3 6.2-6.3c.2-.2.3-.5.3-.7s-.1-.5-.3-.7c-.2-.2-.4-.3-.7-.3h-11c-.3 0-.5.1-.7.3-.2.2-.3.4-.3.7s.1.5.3.7z"></path>
    </svg>
  );
}

function SortUp({ sort }: TIconSort) {
  return (
    <svg
      className={clsx(sort === 'asc' ? 'fill-current' : 'fill-black-40 dark:fill-black-40')}
      stroke="currentColor"
      strokeWidth="0"
      version="1.2"
      baseProfile="tiny"
      viewBox="0 0 24 24"
      height="10"
      width="10"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.2 13.3l-6.2-6.3-6.2 6.3c-.2.2-.3.5-.3.7s.1.5.3.7c.2.2.4.3.7.3h11c.3 0 .5-.1.7-.3.2-.2.3-.5.3-.7s-.1-.5-.3-.7z"></path>
    </svg>
  );
}
