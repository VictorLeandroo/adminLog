const { RouteStatus } = require('@prisma/client');

const prisma = require('../../lib/prisma');

function getMonthRange(query = {}) {
  const now = new Date();
  const year = Number(query.year || now.getFullYear());
  const month = Number(query.month || now.getMonth() + 1);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  return { year, month, startDate, endDate };
}

function sum(list, selector) {
  return list.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

function quinzenna(date) {
  return new Date(date).getDate() <= 15 ? 1 : 2;
}

async function getDashboard(user, query) {
  const { year, month, startDate, endDate } = getMonthRange(query);
  const periodWhere = {
    date: {
      gte: startDate,
      lt: endDate,
    },
  };

  const [revenues, expenses, routes] = await Promise.all([
    prisma.revenue.findMany({
      where: periodWhere,
      select: {
        amount: true,
        date: true,
      },
    }),
    prisma.expense.findMany({
      where: periodWhere,
      select: {
        amount: true,
        date: true,
        category: true,
      },
    }),
    prisma.route.findMany({
      where: {
        ...periodWhere,
        ...(user.role === 'DRIVER' ? { driverId: user.id } : {}),
      },
      select: {
        initialKm: true,
        finalKm: true,
        status: true,
        cities: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const totalRevenue = sum(revenues, (item) => item.amount);
  const totalExpenses = sum(expenses, (item) => item.amount);
  const completedRoutes = routes.filter((route) => route.status !== RouteStatus.IN_PROGRESS);
  const totalRoutes = completedRoutes.length;
  const totalKm = completedRoutes.reduce((total, route) => {
    if (!route.finalKm) return total;
    return total + Math.max(0, Number(route.finalKm) - Number(route.initialKm));
  }, 0);

  const firstHalfBalance = sum(revenues.filter((item) => quinzenna(item.date) === 1), (item) => item.amount)
    - sum(expenses.filter((item) => quinzenna(item.date) === 1), (item) => item.amount);
  const secondHalfBalance = sum(revenues.filter((item) => quinzenna(item.date) === 2), (item) => item.amount)
    - sum(expenses.filter((item) => quinzenna(item.date) === 2), (item) => item.amount);

  const cityCount = {};
  completedRoutes.forEach((route) => {
    route.cities.forEach((city) => {
      cityCount[city.name] = (cityCount[city.name] || 0) + 1;
    });
  });

  const expenseGroups = {};
  expenses.forEach((expense) => {
    if (!expenseGroups[expense.category]) {
      expenseGroups[expense.category] = { category: expense.category, total: 0, count: 0 };
    }

    expenseGroups[expense.category].total += Number(expense.amount || 0);
    expenseGroups[expense.category].count += 1;
  });

  const cityFrequency = Object.entries(cityCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return {
    period: { year, month },
    totalRevenue,
    totalExpenses,
    finalBalance: totalRevenue - totalExpenses,
    totalRoutes,
    totalKm,
    averagePerRoute: totalRoutes ? totalRevenue / totalRoutes : 0,
    firstHalfBalance,
    secondHalfBalance,
    cityFrequency,
    topCity: cityFrequency[0]
      ? { name: cityFrequency[0].name, count: cityFrequency[0].value }
      : { name: 'Sem dados', count: 0 },
    topExpenses: Object.values(expenseGroups)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4),
  };
}

module.exports = { getDashboard };
