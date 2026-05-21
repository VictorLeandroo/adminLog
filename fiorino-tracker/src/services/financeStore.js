const STORAGE_KEY = 'fiorino-finance'

const defaultFinanceData = {
    revenues: [
        {
            id: 1,
            description: 'Recebimento Empresa',
            date: '2026-05-10',
            quinzenna: 1,
            amount: 8128.98,
            paid: true
        },
        {
            id: 2,
            description: 'Recebimento Empresa',
            date: '2026-05-25',
            quinzenna: 2,
            amount: 6989.01,
            paid: true
        }
    ],
    expenses: [
        { id: 1, date: '2026-05-02', category: 'Parcela do carro', description: 'Financiamento Fiorino', amount: 1830, paid: true, quinzenna: 1, photos: [] },
        { id: 2, date: '2026-05-05', category: 'Salario motorista', description: 'Adiantamento quinzenal', amount: 2000, paid: true, quinzenna: 1, photos: [] },
        { id: 3, date: '2026-05-20', category: 'Salario motorista', description: 'Fechamento quinzenal', amount: 2000, paid: true, quinzenna: 2, photos: [] },
        { id: 4, date: '2026-05-06', category: 'Salario contabilidade', description: 'Contabilidade mensal', amount: 150, paid: true, quinzenna: 1, photos: [] },
        { id: 5, date: '2026-05-11', category: 'Salario contabilidade', description: 'Contabilidade mensal', amount: 150, paid: true, quinzenna: 2, photos: [] },
        { id: 6, date: '2026-05-08', category: 'Gasolina e pedagio', description: 'Combustivel e pedagios', amount: 1700, paid: true, quinzenna: 1, photos: [] },
        { id: 7, date: '2026-05-23', category: 'Gasolina e pedagio', description: 'Combustivel e pedagios', amount: 1700, paid: true, quinzenna: 2, photos: [] },
        { id: 8, date: '2026-05-18', category: 'Seguro', description: 'Seguro', amount: 213, paid: true, quinzenna: 2, photos: [] },
        { id: 9, date: '2026-05-21', category: 'IPVA', description: 'Parcela IPVA', amount: 401, paid: true, quinzenna: 2, photos: [] },
        { id: 10, date: '2026-05-28', category: 'DAS', description: 'Imposto DAS', amount: 87, paid: true, quinzenna: 2, photos: [] }
    ],
    allocations: [
        { id: 1, category: 'Reserva de Emergencia', firstHalf: 1400, secondHalf: 1000 },
        { id: 2, category: 'Manutencao do carro', firstHalf: 0, secondHalf: 250 },
        { id: 3, category: 'Reforma do escritorio', firstHalf: 0, secondHalf: 250 },
        { id: 4, category: 'Reembolso emprestimo pessoal', firstHalf: 1000, secondHalf: 1000 }
    ],
    statementRequests: []
}

export function getFinanceData() {
    const saved = localStorage.getItem(STORAGE_KEY)

    if (saved) {
        try {
            return JSON.parse(saved)
        } catch (error) {
            console.error(error)
        }
    }

    saveFinanceData(defaultFinanceData)
    return defaultFinanceData
}

export function saveFinanceData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
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
