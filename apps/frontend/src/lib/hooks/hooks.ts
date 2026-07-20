import { useAuthMeQuery } from '@/redux/api/auth';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getLocalStorage, setLocalStorage } from '../storage';
import { DEFAULT_DATA_PER_PAGE } from '../variables/example';

export function useOnClickOutside(
  ref: React.RefObject<HTMLDivElement | HTMLElement>,
  handler: (currentTarget?: HTMLElement | null, el?: HTMLDivElement | HTMLElement) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      // Do nothing if clicking ref's element or descendent elements
      if (!ref.current || ref.current.contains(event.target as HTMLDivElement)) return;
      handler(event.target as HTMLElement, ref.current);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

export function useModal<TModalName, TData = unknown>(initialOptions?: IuseModal<TModalName>) {
  const [currentShow, setCurrentShow] = useState(initialOptions?.show || false);
  const [name, setName] = useState<TModalName | undefined>(initialOptions?.modalName || undefined);
  const [data, setData] = useState<TData | null>(null);

  const hideModal = () => {
    setCurrentShow(false);
    setName(undefined);
    // Remove modal-open class from body
    document.body.classList?.remove('modal-open');
  };

  const showModal = (modalName: TModalName, data?: TData) => {
    setName(modalName);
    setCurrentShow(true);
    if (data) setData(data);
  };

  return {
    data,
    modalName: name,
    showModal,
    show: currentShow,
    hideModal,
  };
}

export function useSensorKeyboard(keys: string[], triggerFn: (key: string, e?: KeyboardEvent) => void, options?: { usingCtrl?: boolean }) {
  useEffect(() => {
    const sensorListener = (e: KeyboardEvent) => {
      const keyPressed = [...keys].indexOf(e.key) > -1;

      if (options?.usingCtrl && e.ctrlKey && keyPressed) {
        triggerFn(`CTRL + ${e.key}`, e);
        return;
      }
      if (keyPressed) triggerFn(e.key, e);
    };
    window.addEventListener('keydown', sensorListener);

    return () => {
      window.removeEventListener('keydown', sensorListener);
    };
  }, [keys, options?.usingCtrl, triggerFn]);
}

export function useLocalStorage<TValue>(keyName?: string, options?: { jsonParse: boolean }) {
  const setValue = (key: string, value: string) => {
    setLocalStorage(key, value);
  };

  const value: TValue | undefined = keyName
    ? options?.jsonParse
      ? JSON.parse(getLocalStorage<TValue>(keyName) as string)
      : getLocalStorage<TValue>(keyName)
    : undefined;

  return { value, setValue };
}

export function useUserLogin() {
  const { data, status } = useAuthMeQuery();
  const authorized = status === 'fulfilled';
  const unauthorized = status === 'rejected';
  return { data, authorized, unauthorized };
}

export function usePagination<TData>({
  page = 1,
  data,
  dataPerPage = 50,
  optionSearch,
}: {
  page?: number;
  data: TData[];
  dataPerPage?: number;
  optionSearch?: {
    fields: Array<keyof TData>;
    value: string;
  };
}) {
  const [currentDataPerPage, setCurrentDataPerPage] = useState<number>(dataPerPage);
  const [currentPage, setCurrentPage] = useState<number>(page);

  const filterSearch = useCallback(
    (data: TData[]) => {
      if (!optionSearch) return data;
      return data.filter((item) => {
        for (let i = 0; i < optionSearch.fields.length; i++) {
          const field = item[optionSearch.fields[i]] as string;
          if (field.toString().toLowerCase().includes(optionSearch.value.toLowerCase())) {
            return true;
          }
        }
      });
    },
    [optionSearch]
  );

  const filterSearchData = filterSearch(data);
  const filteredData = useMemo(() => {
    return filterSearchData.slice((currentPage - 1) * currentDataPerPage, currentPage * currentDataPerPage);
  }, [filterSearchData, currentPage, currentDataPerPage]);

  const onNextPrev = (page: number) => {
    const isClickPrev = page < 0;
    if (!isClickPrev && currentPage >= totalPage) return;
    if (!isClickPrev && !filteredData.length) return;
    if (isClickPrev && (!(currentPage - 1) || !data.length)) return;
    setCurrentPage((state) => state + page);
  };

  const totalPage = Math.ceil(filterSearchData.length / currentDataPerPage);
  return {
    allData: data,
    page: currentPage,
    data: filteredData,
    setPage: setCurrentPage,
    onNextPrev,
    totalPage,
    setDataPerPage: setCurrentDataPerPage,
    dataPerPage: currentDataPerPage,
  };
}

export function useSortData<TData>({ data, defaultField }: { data: TData[]; defaultField?: keyof TData; sortBy?: TIconSort['sort'] }) {
  const [currentField, setCurrentField] = useState<keyof TData | null>(defaultField || null);
  const [currentSortBy, setCurrentSortBy] = useState<TIconSort['sort']>('unset');

  const setSortBy = (sortBy: TIconSort['sort'], field: keyof TData) => {
    setCurrentSortBy(sortBy);
    setCurrentField(field);
  };

  const registerSort = (name: keyof TData) => {
    return {
      onClickSort: (sort: TIconSort['sort']) => setSortBy(sort, name),
      activeSort: currentField !== name ? false : true,
    };
  };

  const sorted = useMemo(() => {
    const mutableData = [...data];
    if (!currentField || currentSortBy === 'unset') return mutableData;

    return mutableData?.sort((a, b) => {
      let comparison = 0;
      if (a[currentField] > b[currentField]) {
        comparison = 1;
      } else if (a[currentField] < b[currentField]) {
        comparison = -1;
      }
      // Jika descending, balik nilai perbandingan
      return currentSortBy === 'asc' ? comparison : -comparison;
    });
  }, [data, currentField, currentSortBy]);

  return {
    data: sorted,
    setSortBy,
    fieldSorted: currentField,
    registerSort,
  };
}
type Filter = {
  search: string;
  perPage: number | null;
  page: number | null;
  tanggal_awal: string;
  tanggal_akhir: string;
  dateTime: string;
};
const initFilter: Filter = {
  search: '',
  perPage: DEFAULT_DATA_PER_PAGE,
  page: 1,
  tanggal_awal: dayjs().format('YYYY-MM-DD'),
  tanggal_akhir: dayjs().format('YYYY-MM-DD'),
  dateTime: '',
};

export function useParams(options?: IuseParams) {
  const [currentFilter, setCurrentFilter] = useState<typeof initFilter>({
    search: options?.search || initFilter.search,
    perPage: options?.perPage || initFilter.perPage,
    page: options?.page || initFilter.page,
    tanggal_awal: options?.tanggal_awal || initFilter.tanggal_awal,
    tanggal_akhir: options?.tanggal_akhir || initFilter.tanggal_akhir,
    dateTime: options?.dateTime || initFilter.dateTime,
  });

  const setSearch = (search: string) => setCurrentFilter((state) => ({ ...state, search }));
  const setPerPage = (perPage: number | null) => setCurrentFilter((state) => ({ ...state, perPage }));
  const setPage = (page: number | null) => setCurrentFilter((state) => ({ ...state, page }));
  const setTanggalAwal = (tanggal_awal: string) => setCurrentFilter((state) => ({ ...state, tanggal_awal }));
  const setTanggalAkhir = (tanggal_akhir: string) => setCurrentFilter((state) => ({ ...state, tanggal_akhir }));
  const setDateTime = useCallback((dateTime: string) => {
    setCurrentFilter((state) => ({ ...state, dateTime }));
  }, []);

  const onNextPrev = (page: number) => {
    if (!currentFilter.page) return;
    if (currentFilter.page < 0) return;
    setCurrentFilter((state) => ({ ...state, page: (state.page || 1) + page }));
  };

  return {
    search: currentFilter.search,
    perPage: currentFilter.perPage,
    page: currentFilter.page,
    tanggal_awal: currentFilter.tanggal_awal,
    tanggal_akhir: currentFilter.tanggal_akhir,
    dateTime: currentFilter.dateTime,
    setSearch,
    setPerPage,
    setPage,
    onNextPrev,
    setTanggalAwal,
    setTanggalAkhir,
    setDateTime,
  };
}
