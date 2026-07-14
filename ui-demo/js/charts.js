/**
 * Chart helpers for price / category / detail trend views.
 */
const Charts = (() => {
  const registry = new Map();

  function destroy(key) {
    const existing = registry.get(key);
    if (existing) {
      existing.destroy();
      registry.delete(key);
    }
  }

  function destroyAll() {
    for (const key of [...registry.keys()]) destroy(key);
  }

  function lineChart(canvasId, labels, datasets, scaleOverrides = null) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === "undefined") return null;
    const scales = scaleOverrides || {
      x: {
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: "rgba(0,0,0,0.06)" },
        ticks: { callback: (v) => v },
      },
    };
    const chart = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "bottom" },
        },
        scales,
      },
    });
    registry.set(canvasId, chart);
    return chart;
  }

  const palette = ["#0f766e", "#b54708", "#175cd3", "#7a2e4a", "#3f6212", "#53389e", "#c11574"];

  function formatDay(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function priceTrend(canvasId, seriesList) {
    if (!seriesList.length) {
      destroy(canvasId);
      return;
    }
    const labels = seriesList[0].points.map((p) => formatDay(p.ts));
    const datasets = seriesList.map((s, i) => ({
      label: `${Store.productName(s.product_id)} · ${Store.platformName(s.platform_id)}/${Store.marketName(s.market_id)}${s.shop_name ? " · " + s.shop_name : ""}`,
      data: s.points.map((p) => p.price),
      borderColor: palette[i % palette.length],
      backgroundColor: "transparent",
      tension: 0.25,
      pointRadius: 0,
      borderWidth: 2,
    }));
    lineChart(canvasId, labels, datasets);
  }

  function categoryTrend(canvasId, seriesList, groupBy) {
    if (!seriesList.length) {
      destroy(canvasId);
      return;
    }
    const labels = seriesList[0].points.map((p) => formatDay(p.ts));
    const groups = new Map();
    for (const s of seriesList) {
      const key = groupBy === "platform" ? s.platform_id : s.market_id;
      if (!groups.has(key)) {
        groups.set(key, s.points.map(() => ({ sum: 0, n: 0 })));
      }
      const bucket = groups.get(key);
      s.points.forEach((p, idx) => {
        bucket[idx].sum += p.price;
        bucket[idx].n += 1;
      });
    }
    const datasets = [...groups.entries()].map(([key, buckets], i) => ({
      label:
        groupBy === "platform"
          ? Store.platformName(key)
          : `${Store.platformName(seriesList.find((s) => s.market_id === key)?.platform_id || "")} / ${Store.marketName(key)}`,
      data: buckets.map((b) => (b.n ? Math.round((b.sum / b.n) * 100) / 100 : null)),
      borderColor: palette[i % palette.length],
      backgroundColor: "transparent",
      tension: 0.25,
      pointRadius: 0,
      borderWidth: 2,
    }));
    lineChart(canvasId, labels, datasets);
  }

  /** Single series: price / sold / revenue over selected range. */
  function detailMetrics(canvasId, points) {
    if (!points.length) {
      destroy(canvasId);
      return;
    }
    const labels = points.map((p) => formatDay(p.ts));
    lineChart(
      canvasId,
      labels,
      [
        {
          label: "价格",
          data: points.map((p) => p.price),
          borderColor: palette[0],
          backgroundColor: "transparent",
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y",
        },
        {
          label: "销量",
          data: points.map((p) => p.sold),
          borderColor: palette[1],
          backgroundColor: "transparent",
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y1",
        },
        {
          label: "销售额",
          data: points.map((p) => p.revenue),
          borderColor: palette[2],
          backgroundColor: "transparent",
          tension: 0.25,
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y1",
        },
      ],
      {
        x: {
          grid: { color: "rgba(0,0,0,0.04)" },
          ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
        },
        y: {
          type: "linear",
          position: "left",
          title: { display: true, text: "价格" },
          grid: { color: "rgba(0,0,0,0.06)" },
        },
        y1: {
          type: "linear",
          position: "right",
          title: { display: true, text: "销量 / 销售额" },
          grid: { drawOnChartArea: false },
        },
      }
    );
  }

  return { destroyAll, priceTrend, categoryTrend, detailMetrics };
})();
