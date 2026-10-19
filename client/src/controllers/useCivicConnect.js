import { useCallback, useEffect, useState } from 'react'
import { api } from '../models/api.js'

export function useCivicConnect() {
  const [user, setUser] = useState(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState(null)
  const [staff, setStaff] = useState([])
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [statusFilter, setStatusFilter] = useState('open')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const refreshRequests = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const result = await api.listRequests({
        status: statusFilter === 'all' ? '' : statusFilter,
        category: categoryFilter,
        search,
        page,
      })
      setRequests(result.items)
      setPagination({ total: result.total, page: result.page, pageSize: result.pageSize })
      if (selectedRequest) {
        const updated = result.items.find((item) => item.id === selectedRequest.id)
        if (updated) setSelectedRequest(updated)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [user, statusFilter, categoryFilter, search, page, selectedRequest?.id])

  useEffect(() => {
    let active = true
    api.currentUser()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser)
      })
      .catch((requestError) => {
        if (!active) return
        setUser(null)
        if (requestError.status !== 401) {
          setError(`Could not restore your session: ${requestError.message}`)
        }
      })
      .finally(() => {
        if (active) setSessionLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!user) return
    refreshRequests()
    if (user.role === 'management') {
      api.summary().then(({ summary: value }) => setSummary(value)).catch((e) => setError(e.message))
      api.listStaff().then(({ staff: value }) => setStaff(value)).catch((e) => setError(e.message))
    }
  }, [user, refreshRequests])

  async function signIn(credentials, register = false) {
    setError('')
    setNotice('')
    try {
      const result = register
        ? await api.register(credentials)
        : await api.login(credentials)
      setUser(result.user)
      setStatusFilter('open')
      setCategoryFilter('')
      setPage(1)
      setNotice(register ? 'Your requester account is ready.' : 'You are signed in.')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function signOut() {
    try {
      await api.logout()
      setUser(null)
      setRequests([])
      setSelectedRequest(null)
      setSummary(null)
      setNotice('')
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function runAction(action, successMessage) {
    setError('')
    setNotice('')
    const selectedId = selectedRequest?.id
    try {
      await action()
      setNotice(successMessage)
      await refreshRequests()
      if (selectedId) {
        const result = await api.getRequest(selectedId)
        setSelectedRequest(result.request)
      }
      if (user?.role === 'management') {
        const { summary: value } = await api.summary()
        setSummary(value)
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return {
    user,
    sessionLoaded,
    requests,
    summary,
    staff,
    selectedRequest,
    setSelectedRequest,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    search,
    setSearch,
    page,
    setPage,
    pagination,
    loading,
    error,
    setError,
    notice,
    signIn,
    signOut,
    runAction,
    refreshRequests,
  }
}
