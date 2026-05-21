export function getFinanceData() {
    return {
        revenues: [],
        expenses: [],
        allocations: [],
        statementRequests: []
    }
}

export function getQuinzenna(date) {
    const dateText = String(date || '')
    const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const parsed = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(date)
    const day = parsed.getDate()
    return day <= 15 ? 1 : 2
}

export function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    })
}
