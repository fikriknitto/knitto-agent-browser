import type { TestCaseResult } from "./bridge.js";

/** Screenshots captured during a TC — prefer tc-id prefix, fall back to baseline slice. */
export function screenshotsForTestCase(args: {
  allFiles: string[];
  testCaseId: string;
  baseline: number;
  toServeUrl: (filename: string) => string;
}): string[] {
  const { allFiles, testCaseId, baseline, toServeUrl } = args;
  const prefix = `${testCaseId}-`;
  const prefixed = allFiles.filter((name) => name.startsWith(prefix));
  if (prefixed.length > 0) {
    return prefixed.map(toServeUrl);
  }
  return allFiles.slice(baseline).map(toServeUrl);
}

function statusLabel(status: TestCaseResult["status"]): string {
  switch (status) {
    case "completed": return "Berhasil";
    case "error":     return "Gagal";
    case "skipped":   return "Dilewati";
    case "running":   return "Sedang Berjalan";
    case "pending":   return "Menunggu";
    default:          return status;
  }
}

function platformLabel(platform: string): string {
  return platform === "mobile" ? "Mobile (Android)" : "Browser (Web)";
}

/**
 * Bangun laporan lengkap per test case dalam format yang mudah dibaca tester non-teknis.
 * Mengikuti format: Skenario, Langkah, Expected, Actual, Kesimpulan, Saran, Screenshot, Detail Teknis.
 */
export function buildMultiTestCaseResultMarkdown(testCaseResults: TestCaseResult[]): string {
  if (!testCaseResults.length) return "";

  const lines = ["## HASIL PENGUJIAN", ""];

  for (const [index, tc] of testCaseResults.entries()) {
    const heading = tc.title?.trim() || tc.testCaseId;
    const isSuccess = tc.status === "completed";
    const isSkipped = tc.status === "skipped";
    const statusText = statusLabel(tc.status);

    lines.push(`---`);
    lines.push(``);
    lines.push(`### Test Case ${index + 1}: ${heading}`);
    lines.push(``);
    lines.push(`**Status: ${statusText}**`);
    lines.push(`**Platform:** ${platformLabel(tc.platform)}`);
    lines.push(``);

    if (isSkipped) {
      lines.push(`**Skenario:**`);
      lines.push(tc.scenario?.trim() || heading);
      lines.push(``);
      lines.push(`**Kesimpulan:**`);
      lines.push(`Test case ini dilewati dan tidak dijalankan.`);
      lines.push(``);
      continue;
    }

    // Skenario
    lines.push(`**Skenario:**`);
    lines.push(tc.scenario?.trim() || tc.summary?.trim() || heading);
    lines.push(``);

    // Langkah yang dilakukan
    if (tc.stepsPerformed?.trim()) {
      lines.push(`**Langkah yang Dilakukan:**`);
      lines.push(tc.stepsPerformed.trim());
      lines.push(``);
    }

    // Hasil yang diharapkan
    if (tc.expectedResult?.trim()) {
      lines.push(`**Hasil yang Diharapkan:**`);
      lines.push(tc.expectedResult.trim());
      lines.push(``);
    }

    // Hasil aktual
    if (tc.actualResult?.trim()) {
      lines.push(`**Hasil Aktual:**`);
      lines.push(tc.actualResult.trim());
      lines.push(``);
    }

    // Kesimpulan
    lines.push(`**Kesimpulan:**`);
    if (tc.conclusion?.trim()) {
      lines.push(tc.conclusion.trim());
    } else if (isSuccess) {
      lines.push(`Test case berhasil dijalankan. Semua langkah berjalan sesuai yang diharapkan.`);
    } else {
      lines.push(`Test case gagal. ${tc.failureReason?.trim() || tc.summary?.trim() || "Terjadi kesalahan saat menjalankan test."}`);
    }
    lines.push(``);

    // Saran perbaikan (wajib jika gagal)
    if (!isSuccess) {
      lines.push(`**Saran Perbaikan:**`);
      if (tc.suggestion?.trim()) {
        lines.push(tc.suggestion.trim());
      } else {
        lines.push(`Periksa kembali langkah yang gagal dan pastikan kondisi awal (data, akses, dan tampilan) sudah sesuai sebelum menjalankan ulang test ini.`);
      }
      lines.push(``);
    }

    // Screenshot
    lines.push(`**Screenshot:**`);
    if (tc.screenshots?.length) {
      for (const url of tc.screenshots) {
        lines.push(`- ${url}`);
      }
    } else if (tc.screenshotNote?.trim()) {
      lines.push(`Tidak tersedia — ${tc.screenshotNote.trim()}`);
    } else {
      lines.push(`Tidak ada screenshot yang tersimpan untuk test case ini.`);
    }
    lines.push(``);

    // Video (jika ada)
    if (tc.videoUrl) {
      const filename = tc.videoUrl.split("/").pop() ?? tc.videoUrl;
      lines.push(`**Video Rekaman:** ${filename}`);
      lines.push(``);
    }

    // Detail teknis — disembunyikan di bawah, untuk developer
    if (tc.technicalDetail?.trim()) {
      lines.push(`<details>`);
      lines.push(`<summary>Detail Teknis (untuk developer)</summary>`);
      lines.push(``);
      lines.push("```");
      lines.push(tc.technicalDetail.trim());
      lines.push("```");
      lines.push(``);
      lines.push(`</details>`);
      lines.push(``);
    }
  }

  return lines.join("\n").trimEnd();
}

/**
 * Ringkasan singkat seluruh test case — ditampilkan di atas laporan detail.
 */
export function buildMultiTestCaseSummaryMarkdown(testCaseResults: TestCaseResult[]): string {
  if (!testCaseResults.length) return "Tidak ada test case yang dijalankan.";

  const total = testCaseResults.length;
  const passed = testCaseResults.filter((tc) => tc.status === "completed").length;
  const failed = testCaseResults.filter((tc) => tc.status === "error").length;
  const skipped = testCaseResults.filter((tc) => tc.status === "skipped").length;

  const headerLines = [
    `## Ringkasan Hasil Pengujian`,
    ``,
    `Total: **${total} test case** — Berhasil: **${passed}**, Gagal: **${failed}**, Dilewati: **${skipped}**`,
    ``,
  ];

  const itemLines = testCaseResults.map((tc, i) => {
    const title = tc.title?.trim() || tc.testCaseId;
    const icon = tc.status === "completed" ? "✓" : tc.status === "skipped" ? "–" : "✗";
    const statusText = statusLabel(tc.status);

    if (tc.status === "error") {
      const reason = tc.failureReason?.trim() || tc.conclusion?.trim() || tc.summary?.trim() || "Terjadi kegagalan.";
      return `${i + 1}. [${icon}] **${title}** — ${statusText}: ${reason}`;
    }
    if (tc.status === "skipped") {
      return `${i + 1}. [${icon}] **${title}** — ${statusText}`;
    }
    const conclusion = tc.conclusion?.trim() || tc.summary?.trim() || "Berhasil dijalankan.";
    return `${i + 1}. [${icon}] **${title}** — ${statusText}: ${conclusion}`;
  });

  return [...headerLines, ...itemLines].join("\n");
}
