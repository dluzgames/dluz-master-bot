const config = require('../config');

const auth = 'Basic ' + Buffer.from(config.WC.consumerKey + ':' + config.WC.consumerSecret).toString('base64');
const baseUrl = config.WC.url;

async function getRecentOrders(limit = 5) {
  try {
    const res = await fetch(`${baseUrl}/orders?per_page=${limit}`, {
      headers: { 'Authorization': auth }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const orders = await res.json();
    return orders;
  } catch (e) {
    console.error('Erro ao buscar pedidos:', e.message);
    return [];
  }
}

async function getProductsList(limit = 10) {
  try {
    const res = await fetch(`${baseUrl}/products?per_page=${limit}`, {
      headers: { 'Authorization': auth }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const products = await res.json();
    return products;
  } catch (e) {
    console.error('Erro ao buscar produtos:', e.message);
    return [];
  }
}

async function getTodaySummary() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`${baseUrl}/reports/sales?period=today`, {
      headers: { 'Authorization': auth }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const reports = await res.json();
    return reports[0] || { total_sales: '0.00', total_orders: 0 };
  } catch (e) {
    console.error('Erro ao buscar relatório:', e.message);
    return { total_sales: '0.00', total_orders: 0 };
  }
}

module.exports = {
  getRecentOrders,
  getProductsList,
  getTodaySummary
};
