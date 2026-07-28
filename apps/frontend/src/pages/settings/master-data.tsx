import { useEffect, useState } from "react";
import { PlusIcon, Trash2Icon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Button, Input, Select } from "@/components/chat/ui";
import {
  createMdEndpoint,
  createMdFeature,
  createMdService,
  createMdTestData,
  createMdTestcaseLibrary,
  deleteMdEndpoint,
  deleteMdFeature,
  deleteMdService,
  deleteMdTestData,
  deleteMdTestcaseLibrary,
  listMdEndpoints,
  listMdFeatures,
  listMdServices,
  listMdTestData,
  listMdTestcaseLibrary,
  type MdEndpoint,
  type MdFeature,
  type MdService,
  type MdTestData,
  type MdTestcaseLibrary,
} from "@/lib/api/master-data-api";

// Halaman CRUD Master Data (md_services -> md_features -> md_endpoints/md_test_data/md_testcase_library).
// Lihat docs/plan/data-model.md §Kelompok C. Lampiran (md_attachments) dan inbox Suggestions
// (md_suggestions) belum ada UI-nya di sini -- menyusul, mengikuti pola yang sama.

function FeatureDetail({ feature }: { feature: MdFeature }) {
  const [endpoints, setEndpoints] = useState<MdEndpoint[]>([]);
  const [library, setLibrary] = useState<MdTestcaseLibrary[]>([]);
  const [pathOrSelector, setPathOrSelector] = useState("");
  const [libraryTitle, setLibraryTitle] = useState("");
  const [error, setError] = useState("");

  const reload = async () => {
    try {
      const [e, l] = await Promise.all([
        listMdEndpoints(feature.id),
        listMdTestcaseLibrary(feature.id),
      ]);
      setEndpoints(e);
      setLibrary(l);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail feature");
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.id]);

  return (
    <div className="ml-4 space-y-3 border-l border-black/10 py-2 pl-4 dark:border-white/10">
      {error && <p className="m-0 text-xs text-red-500">{error}</p>}

      <div>
        <p className="m-0 text-xs font-medium text-black-60 dark:text-slate-400">Endpoints / Screens</p>
        <ul className="mt-1 space-y-1">
          {endpoints.map((ep) => (
            <li key={ep.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-mono">
                {ep.method ? `${ep.method} ` : ""}
                {ep.pathOrSelector}
              </span>
              <button
                type="button"
                onClick={() => deleteMdEndpoint(ep.id).then(reload)}
                className="text-red-400 hover:text-red-300"
                aria-label={`Hapus endpoint ${ep.pathOrSelector}`}
              >
                <Trash2Icon className="size-3" />
              </button>
            </li>
          ))}
          {endpoints.length === 0 && (
            <li className="text-xs italic text-black-40 dark:text-slate-600">Belum ada</li>
          )}
        </ul>
        <div className="mt-1 flex gap-1">
          <Input
            value={pathOrSelector}
            onChange={(e) => setPathOrSelector(e.target.value)}
            placeholder="GET /orders atau selector"
            className="h-7 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!pathOrSelector.trim()) return;
              try {
                await createMdEndpoint(feature.id, { pathOrSelector: pathOrSelector.trim() });
                setPathOrSelector("");
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Gagal membuat endpoint");
              }
            }}
          >
            <PlusIcon className="size-3" />
          </Button>
        </div>
      </div>

      <div>
        <p className="m-0 text-xs font-medium text-black-60 dark:text-slate-400">Testcase Library</p>
        <ul className="mt-1 space-y-1">
          {library.map((tc) => (
            <li key={tc.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate">{tc.title}</span>
              <button
                type="button"
                onClick={() => deleteMdTestcaseLibrary(tc.id).then(reload)}
                className="text-red-400 hover:text-red-300"
                aria-label={`Hapus testcase ${tc.title}`}
              >
                <Trash2Icon className="size-3" />
              </button>
            </li>
          ))}
          {library.length === 0 && (
            <li className="text-xs italic text-black-40 dark:text-slate-600">Belum ada</li>
          )}
        </ul>
        <div className="mt-1 flex gap-1">
          <Input
            value={libraryTitle}
            onChange={(e) => setLibraryTitle(e.target.value)}
            placeholder="Judul test case reusable"
            className="h-7 text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!libraryTitle.trim()) return;
              try {
                await createMdTestcaseLibrary(feature.id, { title: libraryTitle.trim() });
                setLibraryTitle("");
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Gagal membuat testcase library");
              }
            }}
          >
            <PlusIcon className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ServiceRow({ service, onDeleted }: { service: MdService; onDeleted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [features, setFeatures] = useState<MdFeature[]>([]);
  const [testData, setTestData] = useState<MdTestData[]>([]);
  const [featureName, setFeatureName] = useState("");
  const [testDataName, setTestDataName] = useState("");
  const [error, setError] = useState("");

  const reload = async () => {
    try {
      const [f, td] = await Promise.all([listMdFeatures(service.id), listMdTestData(service.id)]);
      setFeatures(f);
      setTestData(td);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat service");
    }
  };

  useEffect(() => {
    if (expanded) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div className="rounded-lg border border-black/10 dark:border-white/8">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronDownIcon className="size-3.5 shrink-0" />
          ) : (
            <ChevronRightIcon className="size-3.5 shrink-0" />
          )}
          <span className="truncate text-sm font-medium">{service.name}</span>
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] uppercase dark:bg-white/10">
            {service.type}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
              service.verificationStatus === "verified"
                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400"
            }`}
          >
            {service.verificationStatus}
          </span>
        </button>
        <button
          type="button"
          onClick={() => deleteMdService(service.id).then(onDeleted)}
          className="shrink-0 text-red-400 hover:text-red-300"
          aria-label={`Hapus service ${service.name}`}
        >
          <Trash2Icon className="size-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-black/10 px-3 py-2 dark:border-white/8">
          {error && <p className="m-0 text-xs text-red-500">{error}</p>}

          <div>
            <p className="m-0 text-xs font-medium text-black-60 dark:text-slate-400">Features</p>
            {features.map((f) => (
              <div key={f.id} className="mt-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span>{f.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteMdFeature(f.id).then(reload)}
                    className="text-red-400 hover:text-red-300"
                    aria-label={`Hapus feature ${f.name}`}
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                </div>
                <FeatureDetail feature={f} />
              </div>
            ))}
            <div className="mt-1 flex gap-1">
              <Input
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
                placeholder="Nama feature"
                className="h-7 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!featureName.trim()) return;
                  try {
                    await createMdFeature(service.id, { name: featureName.trim() });
                    setFeatureName("");
                    await reload();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Gagal membuat feature");
                  }
                }}
              >
                <PlusIcon className="size-3" />
              </Button>
            </div>
          </div>

          <div>
            <p className="m-0 text-xs font-medium text-black-60 dark:text-slate-400">Test Data</p>
            <ul className="mt-1 space-y-1">
              {testData.map((td) => (
                <li key={td.id} className="flex items-center justify-between gap-2 text-xs">
                  <span>{td.name}</span>
                  <button
                    type="button"
                    onClick={() => deleteMdTestData(td.id).then(reload)}
                    className="text-red-400 hover:text-red-300"
                    aria-label={`Hapus test data ${td.name}`}
                  >
                    <Trash2Icon className="size-3" />
                  </button>
                </li>
              ))}
              {testData.length === 0 && (
                <li className="text-xs italic text-black-40 dark:text-slate-600">Belum ada</li>
              )}
            </ul>
            <div className="mt-1 flex gap-1">
              <Input
                value={testDataName}
                onChange={(e) => setTestDataName(e.target.value)}
                placeholder="Nama fixture"
                className="h-7 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!testDataName.trim()) return;
                  try {
                    await createMdTestData({ serviceId: service.id, name: testDataName.trim() });
                    setTestDataName("");
                    await reload();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Gagal membuat test data");
                  }
                }}
              >
                <PlusIcon className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsMasterDataPage() {
  const [services, setServices] = useState<MdService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<MdService["type"]>("web");

  const reload = async () => {
    setLoading(true);
    try {
      setServices(await listMdServices());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat Master Data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-100 dark:text-white">Master Data</h1>
        <p className="mt-1 text-sm text-black-60 dark:text-greyish-semi-white">
          Katalog service &rarr; feature &rarr; endpoint/test data/testcase library untuk pipeline
          generate test case (di balik flag <code>FEATURE_QA_GEN</code>).
        </p>
      </div>

      <div className="rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/8 dark:bg-[rgba(12,14,22,0.6)]">
        <div className="mb-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-black-60 dark:text-slate-400">
              Nama service
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. CMS Web" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-black-60 dark:text-slate-400">Tipe</label>
            <Select value={type} onChange={(e) => setType(e.target.value as MdService["type"])}>
              <option value="web">web</option>
              <option value="api">api</option>
              <option value="mobile">mobile</option>
              <option value="other">other</option>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              if (!name.trim()) return;
              try {
                await createMdService({ name: name.trim(), type });
                setName("");
                await reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Gagal membuat service");
              }
            }}
          >
            <PlusIcon className="size-3.5" />
            Tambah service
          </Button>
        </div>

        {error && <p className="m-0 pb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {loading && <p className="m-0 py-4 text-sm text-black-40 dark:text-slate-500">Memuat…</p>}

        {!loading && services.length === 0 ? (
          <p className="m-0 py-6 text-center text-sm text-black-40 dark:text-slate-500">
            Belum ada service.
          </p>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <ServiceRow key={s.id} service={s} onDeleted={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
