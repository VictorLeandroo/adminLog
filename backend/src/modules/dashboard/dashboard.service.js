const { RouteStatus, VehicleStatus } = require('@prisma/client');

const prisma = require('../../lib/prisma');

const EXPENSE_BUCKETS = {
  fuel: ['combustivel', 'combustivel', 'fuel'],
  toll: ['pedagio', 'pedagio'],
  maintenance: ['manutencao', 'manutencao do carro', 'maintenance'],
  insurance: ['seguro', 'insurance'],
  ipva: ['ipva', 'licenciamento'],
  installment: ['parcela', 'financiamento'],
  salary: ['salario', 'salario'],
  fine: ['multa'],
};

const ROUTE_UNLOADING_DESCRIPTION_PREFIX = '[ROUTE_UNLOADING:';

const DEFAULT_TARGETS = {
  operationalReservePerVehicle: 10000,
  maintenanceFundPerVehicle: 5000,
  expansionFundPerVehicle: 3000,
  officeFundTarget: 8000,
};

function getMonthRange(query = {}) {
  const now = new Date();
  const year = Number(query.year || now.getFullYear());
  const month = Number(query.month || now.getMonth() + 1);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  return { year, month, startDate, endDate };
}

function getPreviousMonthRange({ year, month }) {
  const date = new Date(year, month - 2, 1);
  return {
    startDate: new Date(date.getFullYear(), date.getMonth(), 1),
    endDate: new Date(date.getFullYear(), date.getMonth() + 1, 1),
  };
}

function getYearRange({ year, month }) {
  const end = new Date(year, month, 1);
  const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
  return { start, end };
}

function rangeFromDate(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return {
    year,
    month,
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 1),
  };
}

function numberValue(value) {
  return Number(value || 0);
}

function sum(list, selector) {
  return list.reduce((total, item) => total + numberValue(selector(item)), 0);
}

function percent(value, base) {
  return base ? (numberValue(value) / numberValue(base)) * 100 : 0;
}

function ratio(value, base) {
  return base ? numberValue(value) / numberValue(base) : 0;
}

function dateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function daysBetween(start, end = new Date()) {
  const ms = new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0);
  return Math.floor(ms / 86400000);
}

function daysUntil(value) {
  return Math.ceil((new Date(value).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function expenseBucket(category) {
  const text = normalizeText(category);
  const entry = Object.entries(EXPENSE_BUCKETS).find(([, terms]) => terms.some((term) => text.includes(normalizeText(term))));
  return entry ? entry[0] : 'other';
}

function routeKm(route) {
  if (!route.finalKm) return 0;
  return Math.max(0, numberValue(route.finalKm) - numberValue(route.initialKm));
}

function routeRevenue(route) {
  return numberValue(route.freightAmount);
}

function isOperationalRoute(route) {
  return route.status !== RouteStatus.IN_PROGRESS;
}

function userRouteWhere(user) {
  return user.role === 'DRIVER' ? { driverId: user.id } : {};
}

function expenseVisibleWhere(user) {
  const where = {
    NOT: { description: { startsWith: ROUTE_UNLOADING_DESCRIPTION_PREFIX } },
  };

  if (user.role === 'DRIVER') where.vehicle = { driverId: user.id };

  return where;
}

function monthKey(date) {
  return `${new Date(date).getFullYear()}-${String(new Date(date).getMonth() + 1).padStart(2, '0')}`;
}

function quinzenna(date) {
  return new Date(date).getDate() <= 15 ? 1 : 2;
}

function trend(current, previous) {
  return {
    previous,
    change: current - previous,
    percent: previous ? ((current - previous) / Math.abs(previous)) * 100 : null,
  };
}

function statusFromProfit(netProfit, margin) {
  if (netProfit < 0 || margin < 5) return 'negative';
  if (margin < 15) return 'attention';
  return 'positive';
}

function targetsFromQuery(query, activeVehicles) {
  return {
    operationalReserve: numberValue(query.operationalReserveTarget) || activeVehicles * DEFAULT_TARGETS.operationalReservePerVehicle,
    maintenanceFund: numberValue(query.maintenanceFundTarget) || activeVehicles * DEFAULT_TARGETS.maintenanceFundPerVehicle,
    expansionFund: numberValue(query.expansionFundTarget) || activeVehicles * DEFAULT_TARGETS.expansionFundPerVehicle,
    officeFund: numberValue(query.officeFundTarget) || DEFAULT_TARGETS.officeFundTarget,
  };
}

function buildFinancialBoxes({ netProfit, activeVehicles, maintenanceExpenses, targets }) {
  const operationalCash = Math.max(0, netProfit);
  const emergencyReserve = Math.min(targets.operationalReserve, Math.max(0, netProfit) * 0.35);
  const maintenanceFund = Math.min(targets.maintenanceFund, Math.max(0, netProfit) * 0.2 + maintenanceExpenses * 0.25);
  const expansionFund = Math.min(targets.expansionFund, Math.max(0, netProfit) * 0.12);
  const officeFund = Math.min(targets.officeFund, Math.max(0, netProfit) * 0.06);
  const reserveGap = Math.max(0, targets.operationalReserve - emergencyReserve);
  const partnersAvailable = reserveGap > 0
    ? Math.max(0, netProfit * 0.15)
    : Math.max(0, netProfit - emergencyReserve - maintenanceFund - expansionFund - officeFund);

  return {
    targets,
    boxes: [
      { key: 'operationalCash', label: 'Caixa operacional', value: operationalCash, target: activeVehicles * 3000, progress: percent(operationalCash, activeVehicles * 3000) },
      { key: 'emergencyReserve', label: 'Reserva de emergencia', value: emergencyReserve, target: targets.operationalReserve, progress: percent(emergencyReserve, targets.operationalReserve) },
      { key: 'maintenanceFund', label: 'Fundo de manutencao', value: maintenanceFund, target: targets.maintenanceFund, progress: percent(maintenanceFund, targets.maintenanceFund) },
      { key: 'expansionFund', label: 'Expansao / frota', value: expansionFund, target: targets.expansionFund, progress: percent(expansionFund, targets.expansionFund) },
      { key: 'officeFund', label: 'Reforma escritorio', value: officeFund, target: targets.officeFund, progress: percent(officeFund, targets.officeFund) },
      { key: 'partners', label: 'Disponivel para socios', value: partnersAvailable, target: netProfit, progress: percent(partnersAvailable, netProfit), locked: reserveGap > 0 },
    ],
    suggestedDistribution: [
      { label: 'Reserva operacional', value: reserveGap > 0 ? Math.min(netProfit * 0.4, reserveGap) : netProfit * 0.2 },
      { label: 'Manutencao', value: netProfit * 0.2 },
      { label: 'Expansao', value: netProfit * 0.12 },
      { label: 'Escritorio', value: netProfit * 0.06 },
      { label: 'Socios', value: partnersAvailable },
    ].map((item) => ({ ...item, value: Math.max(0, item.value) })),
  };
}

function buildHealthScore({ netProfit, margin, financialBoxes, activeVehicles, maintenanceVehicles, pendingRoutes, highExpenses }) {
  let score = 100;
  if (netProfit < 0) score -= 35;
  if (margin < 10) score -= 20;
  if (financialBoxes.boxes.find((box) => box.key === 'emergencyReserve')?.progress < 50) score -= 15;
  if (maintenanceVehicles > 0) score -= Math.min(20, maintenanceVehicles * 8);
  if (pendingRoutes > 0) score -= Math.min(15, pendingRoutes * 4);
  if (highExpenses) score -= 10;
  if (!activeVehicles) score -= 20;

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const status = normalized >= 75 ? 'healthy' : normalized >= 50 ? 'attention' : 'critical';
  const label = status === 'healthy' ? 'Saudavel' : status === 'attention' ? 'Atencao' : 'Critico';

  return { score: normalized, status, label };
}

function addAlert(alerts, severity, title, description, meta = {}) {
  alerts.push({ id: `${severity}-${alerts.length + 1}`, severity, title, description, ...meta });
}

function buildAlerts({ vehicles, routes, expenses, financialBoxes }) {
  const alerts = [];
  const requiredDocs = ['CRLV', 'INSURANCE'];

  vehicles.forEach((vehicle) => {
    if (vehicle.status === VehicleStatus.MAINTENANCE) {
      addAlert(alerts, 'high', 'Veiculo em manutencao', `${vehicle.plate} esta indisponivel para operacao.`, { vehicleId: vehicle.id });
    }

    if (vehicle.insuranceValidUntil) {
      const days = daysUntil(vehicle.insuranceValidUntil);
      if (days < 0) addAlert(alerts, 'critical', 'Seguro vencido', `${vehicle.plate} esta com seguro vencido.`, { vehicleId: vehicle.id });
      else if (days <= 30) addAlert(alerts, days <= 7 ? 'high' : 'medium', 'Seguro vencendo', `${vehicle.plate} vence em ${days} dia(s).`, { vehicleId: vehicle.id });
    }

    if (vehicle.licenseValidUntil) {
      const days = daysUntil(vehicle.licenseValidUntil);
      if (days < 0) addAlert(alerts, 'critical', 'Licenciamento/IPVA vencido', `${vehicle.plate} esta com documento vencido.`, { vehicleId: vehicle.id });
      else if (days <= 30) addAlert(alerts, days <= 7 ? 'high' : 'medium', 'Licenciamento/IPVA vencendo', `${vehicle.plate} vence em ${days} dia(s).`, { vehicleId: vehicle.id });
    }

    if (vehicle.nextMaintenanceAtKm && vehicle.nextMaintenanceAtKm - vehicle.currentKm <= 500) {
      const remaining = vehicle.nextMaintenanceAtKm - vehicle.currentKm;
      addAlert(alerts, remaining <= 0 ? 'critical' : 'medium', 'Manutencao proxima por KM', `${vehicle.plate} tem ${Math.max(0, remaining)} km ate a proxima manutencao.`, { vehicleId: vehicle.id });
    }

    requiredDocs.forEach((type) => {
      const document = vehicle.documents.find((item) => item.type === type);
      if (!document) addAlert(alerts, 'medium', 'Documento faltando', `${vehicle.plate} nao possui ${type} cadastrado.`, { vehicleId: vehicle.id });
      if (document?.expiresAt && daysUntil(document.expiresAt) < 0) {
        addAlert(alerts, 'critical', 'Documento vencido', `${vehicle.plate} possui ${type} vencido.`, { vehicleId: vehicle.id });
      }
    });
  });

  expenses
    .filter((expense) => !expense.photos?.length)
    .slice(0, 6)
    .forEach((expense) => addAlert(alerts, 'low', 'Despesa sem comprovante', `${expense.category} de R$ ${numberValue(expense.amount).toFixed(2)} sem foto.`, { expenseId: expense.id }));

  routes
    .filter((route) => route.status === RouteStatus.PENDING_REVIEW && daysBetween(route.updatedAt || route.createdAt) >= 3)
    .forEach((route) => addAlert(alerts, 'high', 'Rota aguardando revisao', `Rota de ${dateOnly(route.date)} esta pendente ha ${daysBetween(route.updatedAt || route.createdAt)} dias.`, { routeId: route.id }));

  const reserve = financialBoxes.boxes.find((box) => box.key === 'emergencyReserve');
  if (reserve && reserve.progress < 50) {
    addAlert(alerts, 'medium', 'Reserva abaixo da meta', `Reserva operacional em ${Math.round(reserve.progress)}% da meta.`, {});
  }

  return alerts.sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.severity) - ['critical', 'high', 'medium', 'low'].indexOf(b.severity));
}

function groupExpensesByVehicle(expenses) {
  return expenses.reduce((acc, expense) => {
    const key = expense.vehicleId || 'unassigned';
    if (!acc[key]) {
      acc[key] = {
        fuel: 0,
        toll: 0,
        maintenance: 0,
        insurance: 0,
        ipva: 0,
        installment: 0,
        salary: 0,
        fine: 0,
        other: 0,
        total: 0,
      };
    }

    const bucket = expenseBucket(expense.category);
    acc[key][bucket] += numberValue(expense.amount);
    acc[key].total += numberValue(expense.amount);
    return acc;
  }, {});
}

function groupSalaryByDriver(expenses) {
  return expenses.reduce((acc, expense) => {
    if (expenseBucket(expense.category) !== 'salary' || !expense.driverId) return acc;
    acc[expense.driverId] = (acc[expense.driverId] || 0) + numberValue(expense.amount);
    return acc;
  }, {});
}

async function getDashboardContext(user, query = {}) {
  let range = getMonthRange(query);
  const previousRange = getPreviousMonthRange(range);
  const yearlyRange = getYearRange(range);
  const periodWhere = { date: { gte: range.startDate, lt: range.endDate } };
  const previousWhere = { date: { gte: previousRange.startDate, lt: previousRange.endDate } };

  let [revenues, expenses, routes, previousRevenues, previousExpenses, vehicles, drivers, yearlyRevenues, yearlyExpenses, yearlyRoutes] = await Promise.all([
    prisma.revenue.findMany({ where: periodWhere, include: { createdBy: true } }),
    prisma.expense.findMany({ where: { ...periodWhere, ...expenseVisibleWhere(user) }, include: { vehicle: true, driver: true, photos: true } }),
    prisma.route.findMany({
      where: { ...periodWhere, ...userRouteWhere(user) },
      include: { vehicle: true, driver: true, cities: true, invoices: true, photos: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.revenue.findMany({ where: previousWhere }),
    prisma.expense.findMany({ where: { ...previousWhere, ...expenseVisibleWhere(user) } }),
    prisma.vehicle.findMany({ include: { driver: true, documents: true, maintenances: true } }),
    prisma.user.findMany({ where: { role: 'DRIVER' }, include: { assignedVehicles: true } }),
    prisma.revenue.findMany({ where: { date: { gte: yearlyRange.start, lt: yearlyRange.end } } }),
    prisma.expense.findMany({ where: { date: { gte: yearlyRange.start, lt: yearlyRange.end }, ...expenseVisibleWhere(user) } }),
    prisma.route.findMany({
      where: { date: { gte: yearlyRange.start, lt: yearlyRange.end }, ...userRouteWhere(user) },
      include: { vehicle: true, driver: true },
    }),
  ]);

  if (!revenues.length && !expenses.length && !routes.length && query.keepEmpty !== 'true') {
    const [latestRevenue, latestExpense, latestRoute] = await Promise.all([
      prisma.revenue.findFirst({ orderBy: { date: 'desc' }, select: { date: true } }),
      prisma.expense.findFirst({ where: expenseVisibleWhere(user), orderBy: { date: 'desc' }, select: { date: true } }),
      prisma.route.findFirst({ where: userRouteWhere(user), orderBy: { date: 'desc' }, select: { date: true } }),
    ]);
    const latestDate = [latestRevenue?.date, latestExpense?.date, latestRoute?.date]
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];

    if (latestDate) {
      range = rangeFromDate(latestDate);
      const fallbackPreviousRange = getPreviousMonthRange(range);
      const fallbackYearlyRange = getYearRange(range);
      const fallbackPeriodWhere = { date: { gte: range.startDate, lt: range.endDate } };

      [revenues, expenses, routes, previousRevenues, previousExpenses, yearlyRevenues, yearlyExpenses, yearlyRoutes] = await Promise.all([
        prisma.revenue.findMany({ where: fallbackPeriodWhere, include: { createdBy: true } }),
        prisma.expense.findMany({ where: { ...fallbackPeriodWhere, ...expenseVisibleWhere(user) }, include: { vehicle: true, driver: true, photos: true } }),
        prisma.route.findMany({
          where: { ...fallbackPeriodWhere, ...userRouteWhere(user) },
          include: { vehicle: true, driver: true, cities: true, invoices: true, photos: true },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.revenue.findMany({ where: { date: { gte: fallbackPreviousRange.startDate, lt: fallbackPreviousRange.endDate } } }),
        prisma.expense.findMany({ where: { date: { gte: fallbackPreviousRange.startDate, lt: fallbackPreviousRange.endDate }, ...expenseVisibleWhere(user) } }),
        prisma.revenue.findMany({ where: { date: { gte: fallbackYearlyRange.start, lt: fallbackYearlyRange.end } } }),
        prisma.expense.findMany({ where: { date: { gte: fallbackYearlyRange.start, lt: fallbackYearlyRange.end }, ...expenseVisibleWhere(user) } }),
        prisma.route.findMany({
          where: { date: { gte: fallbackYearlyRange.start, lt: fallbackYearlyRange.end }, ...userRouteWhere(user) },
          include: { vehicle: true, driver: true },
        }),
      ]);
    }
  }

  return { range, revenues, expenses, routes, previousRevenues, previousExpenses, vehicles, drivers, yearlyRevenues, yearlyExpenses, yearlyRoutes };
}

function buildSummary(context, query = {}) {
  const { range, revenues, expenses, routes, previousRevenues, previousExpenses, vehicles, drivers } = context;
  const totalRevenue = sum(revenues, (item) => item.amount);
  const totalExpenses = sum(expenses, (item) => item.amount);
  const netProfit = totalRevenue - totalExpenses;
  const margin = percent(netProfit, totalRevenue);
  const previousRevenue = sum(previousRevenues, (item) => item.amount);
  const previousExpensesTotal = sum(previousExpenses, (item) => item.amount);
  const previousProfit = previousRevenue - previousExpensesTotal;
  const completedRoutes = routes.filter(isOperationalRoute);
  const totalKm = sum(completedRoutes, routeKm);
  const activeVehicles = vehicles.filter((vehicle) => vehicle.status !== VehicleStatus.MAINTENANCE).length;
  const maintenanceVehicles = vehicles.filter((vehicle) => vehicle.status === VehicleStatus.MAINTENANCE).length;
  const targets = targetsFromQuery(query, activeVehicles);
  const maintenanceExpenses = expenses.filter((expense) => expenseBucket(expense.category) === 'maintenance');
  const financialBoxes = buildFinancialBoxes({ netProfit, activeVehicles, maintenanceExpenses: sum(maintenanceExpenses, (item) => item.amount), targets });
  const pendingRoutes = routes.filter((route) => route.status === RouteStatus.PENDING_REVIEW).length;
  const highExpenses = totalExpenses > totalRevenue * 0.85 && totalRevenue > 0;
  const health = buildHealthScore({ netProfit, margin, financialBoxes, activeVehicles, maintenanceVehicles, pendingRoutes, highExpenses });

  const cityCount = {};
  completedRoutes.forEach((route) => {
    route.cities.forEach((city) => {
      cityCount[city.name] = (cityCount[city.name] || 0) + 1;
    });
  });

  const expenseGroups = {};
  expenses.forEach((expense) => {
    if (!expenseGroups[expense.category]) expenseGroups[expense.category] = { category: expense.category, total: 0, count: 0 };
    expenseGroups[expense.category].total += numberValue(expense.amount);
    expenseGroups[expense.category].count += 1;
  });

  const cityFrequency = Object.entries(cityCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    period: { year: range.year, month: range.month },
    hero: {
      netProfit,
      totalRevenue,
      totalExpenses,
      margin,
      status: statusFromProfit(netProfit, margin),
      previousMonth: trend(netProfit, previousProfit),
    },
    health,
    kpis: {
      activeVehicles,
      maintenanceVehicles,
      activeDrivers: drivers.filter((driver) => driver.active !== false).length,
      completedRoutes: completedRoutes.length,
      inProgressRoutes: routes.filter((route) => route.status === RouteStatus.IN_PROGRESS).length,
      pendingReviewRoutes: pendingRoutes,
      totalKm,
      averageKmPerRoute: ratio(totalKm, completedRoutes.length),
      costPerKm: ratio(totalExpenses, totalKm),
      revenuePerKm: ratio(totalRevenue, totalKm),
      averageRevenuePerRoute: ratio(totalRevenue, completedRoutes.length),
    },
    firstHalfBalance: sum(revenues.filter((item) => quinzenna(item.date) === 1), (item) => item.amount)
      - sum(expenses.filter((item) => quinzenna(item.date) === 1), (item) => item.amount),
    secondHalfBalance: sum(revenues.filter((item) => quinzenna(item.date) === 2), (item) => item.amount)
      - sum(expenses.filter((item) => quinzenna(item.date) === 2), (item) => item.amount),
    cityFrequency,
    topCity: cityFrequency[0] ? { name: cityFrequency[0].name, count: cityFrequency[0].value } : { name: 'Sem dados', count: 0 },
    topExpenses: Object.values(expenseGroups).sort((a, b) => b.total - a.total).slice(0, 6),
    financialBoxes,
  };
}

function buildVehiclesPerformance(context) {
  const { vehicles, routes, expenses, revenues } = context;
  const expensesByVehicle = groupExpensesByVehicle(expenses);
  const salaryByDriver = groupSalaryByDriver(expenses);
  const completedRoutes = routes.filter((route) => route.status !== RouteStatus.IN_PROGRESS);
  const averageRouteRevenue = ratio(sum(revenues, (item) => item.amount), completedRoutes.length);

  return vehicles.map((vehicle) => {
    const vehicleRoutes = routes.filter((route) => route.vehicleId === vehicle.id && route.status !== RouteStatus.IN_PROGRESS);
    const km = sum(vehicleRoutes, routeKm);
    const directRevenue = sum(vehicleRoutes, routeRevenue);
    const revenue = directRevenue || vehicleRoutes.length * averageRouteRevenue;
    const costs = { ...(expensesByVehicle[vehicle.id] || {}) };
    costs.salary = numberValue(costs.salary) + numberValue(salaryByDriver[vehicle.driverId]);
    costs.total = numberValue(costs.total) + numberValue(salaryByDriver[vehicle.driverId]);
    const netProfit = revenue - numberValue(costs.total);

    return {
      id: vehicle.id,
      plate: vehicle.plate,
      model: vehicle.model,
      driver: vehicle.driver ? { id: vehicle.driver.id, name: vehicle.driver.name } : null,
      status: vehicle.status,
      revenue,
      costs: {
        fuel: numberValue(costs.fuel),
        toll: numberValue(costs.toll),
        maintenance: numberValue(costs.maintenance),
        insurance: numberValue(costs.insurance),
        ipva: numberValue(costs.ipva),
        installment: numberValue(costs.installment),
        salary: numberValue(costs.salary),
        other: numberValue(costs.other),
        total: numberValue(costs.total),
      },
      netProfit,
      margin: percent(netProfit, revenue),
      km,
      costPerKm: ratio(costs.total, km),
      revenuePerKm: ratio(revenue, km),
      completedRoutes: vehicleRoutes.length,
    };
  }).sort((a, b) => b.netProfit - a.netProfit);
}

function buildDriversRanking(context) {
  const { drivers, routes, expenses } = context;
  return drivers.map((driver) => {
    const driverRoutes = routes.filter((route) => route.driverId === driver.id);
    const completedRoutes = driverRoutes.filter(isOperationalRoute);
    const km = sum(completedRoutes, routeKm);
    const fines = expenses.filter((expense) => expenseBucket(expense.category) === 'fine' && expense.vehicle?.driverId === driver.id);
    const pendingReview = driverRoutes.filter((route) => route.status === RouteStatus.PENDING_REVIEW).length;
    const inProgressWithoutPhoto = driverRoutes.filter((route) => route.status === RouteStatus.IN_PROGRESS && !route.photos?.length).length;
    const occurrences = pendingReview + fines.length;
    const score = Math.max(0, Math.min(100, 100 - occurrences * 12 - inProgressWithoutPhoto * 8));

    return {
      id: driver.id,
      name: driver.name,
      vehicle: driver.assignedVehicles?.[0] ? `${driver.assignedVehicles[0].model} ${driver.assignedVehicles[0].plate}` : 'Sem veiculo',
      completedRoutes: completedRoutes.length,
      km,
      absences: 0,
      occurrences,
      fines: fines.length,
      pendingChecklist: inProgressWithoutPhoto,
      score,
    };
  }).sort((a, b) => b.score - a.score);
}

function buildCharts(context, vehiclesPerformance) {
  const { yearlyRevenues, yearlyExpenses, yearlyRoutes, expenses } = context;
  const monthly = {};

  yearlyRevenues.forEach((revenue) => {
    const key = monthKey(revenue.date);
    monthly[key] = monthly[key] || { month: key, revenue: 0, expenses: 0, profit: 0 };
    monthly[key].revenue += numberValue(revenue.amount);
  });

  yearlyExpenses.forEach((expense) => {
    const key = monthKey(expense.date);
    monthly[key] = monthly[key] || { month: key, revenue: 0, expenses: 0, profit: 0 };
    monthly[key].expenses += numberValue(expense.amount);
  });

  Object.values(monthly).forEach((item) => {
    item.profit = item.revenue - item.expenses;
  });

  const expenseCategories = {};
  expenses.forEach((expense) => {
    expenseCategories[expense.category] = (expenseCategories[expense.category] || 0) + numberValue(expense.amount);
  });

  const kmByVehicle = {};
  yearlyRoutes.forEach((route) => {
    if (!route.vehicle) return;
    const key = route.vehicle.plate;
    kmByVehicle[key] = (kmByVehicle[key] || 0) + routeKm(route);
  });

  return {
    monthly: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)),
    expensesByCategory: Object.entries(expenseCategories).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
    revenueByVehicle: vehiclesPerformance.map((item) => ({ label: item.plate, value: item.revenue })),
    profitByVehicle: vehiclesPerformance.map((item) => ({ label: item.plate, value: item.netProfit })),
    kmByVehicle: Object.entries(kmByVehicle).map(([label, value]) => ({ label, value })),
    costPerKm: vehiclesPerformance.map((item) => ({ label: item.plate, value: item.costPerKm })),
    reserveEvolution: Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month)).reduce((acc, item) => {
      const previous = acc[acc.length - 1]?.value || 0;
      acc.push({ month: item.month, value: Math.max(0, previous + item.profit * 0.35) });
      return acc;
    }, []),
  };
}

function buildInsights(context, summary, vehiclesPerformance) {
  const insights = [];
  const previousRevenue = sum(context.previousRevenues, (item) => item.amount);
  const currentFuel = sum(context.expenses.filter((item) => expenseBucket(item.category) === 'fuel'), (item) => item.amount);
  const previousFuel = sum(context.previousExpenses.filter((item) => expenseBucket(item.category) === 'fuel'), (item) => item.amount);
  const reserve = summary.financialBoxes.boxes.find((box) => box.key === 'emergencyReserve');
  const maintenance = summary.topExpenses.find((item) => expenseBucket(item.category) === 'maintenance');

  if (previousRevenue) {
    const change = ((summary.hero.totalRevenue - previousRevenue) / previousRevenue) * 100;
    insights.push({ tone: change >= 0 ? 'positive' : 'negative', title: 'Receita do mes', text: `Receita ${change >= 0 ? 'subiu' : 'caiu'} ${Math.abs(change).toFixed(1)}% em relacao ao mes anterior.` });
  }

  if (previousFuel) {
    const change = ((currentFuel - previousFuel) / previousFuel) * 100;
    insights.push({ tone: change <= 0 ? 'positive' : 'attention', title: 'Combustivel', text: `Combustivel ${change >= 0 ? 'subiu' : 'caiu'} ${Math.abs(change).toFixed(1)}% contra o mes anterior.` });
  }

  if (vehiclesPerformance.length >= 2) {
    const [best, worst] = [...vehiclesPerformance].sort((a, b) => b.margin - a.margin);
    insights.push({ tone: worst.margin < best.margin ? 'attention' : 'neutral', title: 'Margem por Fiorino', text: `${worst.plate} teve margem menor que ${best.plate}.` });
  }

  if (reserve) {
    insights.push({ tone: reserve.progress >= 80 ? 'positive' : 'attention', title: 'Reserva operacional', text: `Reserva atingiu ${Math.min(100, Math.round(reserve.progress))}% da meta.` });
  }

  if (maintenance && maintenance.total > summary.hero.totalRevenue * 0.15) {
    insights.push({ tone: 'attention', title: 'Manutencao', text: 'Manutencao passou de 15% da receita do mes.' });
  }

  if (!insights.length) {
    insights.push({ tone: 'neutral', title: 'Sem historico suficiente', text: 'Assim que houver mais lancamentos, os insights comparativos aparecem aqui.' });
  }

  return insights;
}

async function getDashboard(user, query) {
  const context = await getDashboardContext(user, query);
  const summary = buildSummary(context, query);

  return {
    ...summary,
    totalRevenue: summary.hero.totalRevenue,
    totalExpenses: summary.hero.totalExpenses,
    finalBalance: summary.hero.netProfit,
    totalRoutes: summary.kpis.completedRoutes,
    totalKm: summary.kpis.totalKm,
    averagePerRoute: summary.kpis.averageRevenuePerRoute,
  };
}

async function getExecutiveDashboard(user, query) {
  const context = await getDashboardContext(user, query);
  const summary = buildSummary(context, query);
  const vehiclesPerformance = buildVehiclesPerformance(context);
  const alerts = buildAlerts({ vehicles: context.vehicles, routes: context.routes, expenses: context.expenses, financialBoxes: summary.financialBoxes });
  const driversRanking = buildDriversRanking(context);
  const charts = buildCharts(context, vehiclesPerformance);
  const insights = buildInsights(context, summary, vehiclesPerformance);

  return { summary, vehiclesPerformance, alerts, financialBoxes: summary.financialBoxes, driversRanking, charts, insights };
}

async function getSummary(user, query) {
  const context = await getDashboardContext(user, query);
  return buildSummary(context, query);
}

async function getVehiclesPerformance(user, query) {
  const context = await getDashboardContext(user, query);
  return buildVehiclesPerformance(context);
}

async function getAlerts(user, query) {
  const context = await getDashboardContext(user, query);
  const summary = buildSummary(context, query);
  return buildAlerts({ vehicles: context.vehicles, routes: context.routes, expenses: context.expenses, financialBoxes: summary.financialBoxes });
}

async function getFinancialBoxes(user, query) {
  const context = await getDashboardContext(user, query);
  return buildSummary(context, query).financialBoxes;
}

async function getDriversRanking(user, query) {
  const context = await getDashboardContext(user, query);
  return buildDriversRanking(context);
}

async function getInsights(user, query) {
  const context = await getDashboardContext(user, query);
  const summary = buildSummary(context, query);
  return buildInsights(context, summary, buildVehiclesPerformance(context));
}

module.exports = {
  getDashboard,
  getExecutiveDashboard,
  getSummary,
  getVehiclesPerformance,
  getAlerts,
  getFinancialBoxes,
  getDriversRanking,
  getInsights,
};
