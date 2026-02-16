import { createSignal, createEffect, For, onMount } from 'solid-js'
import { marked } from 'marked'
import './App.css'

// Import markdown files as raw text
const restaurantModules = import.meta.glob('./restaurants/*.md', { 
  query: '?raw',
  import: 'default',
  eager: true 
}) as Record<string, string>

interface Restaurant {
  id: string
  title: string
  content: string
  html: string
}

// Parse restaurants from markdown files
function parseRestaurants(): Restaurant[] {
  return Object.entries(restaurantModules).map(([path, content]) => {
    const id = path.replace('./restaurants/', '').replace('.md', '')
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : id
    return {
      id,
      title,
      content,
      html: marked.parse(content) as string
    }
  })
}

const THEME_KEY = 'yuki-tour-planner-theme'

type Theme = 'light' | 'dark'

// URL state helpers
function getIdsFromUrl(): string[] {
  const params = new URLSearchParams(window.location.search)
  const tour = params.get('tour')
  if (!tour) return []
  return tour.split(',').filter(id => id.length > 0)
}

function setIdsInUrl(ids: string[]) {
  const url = new URL(window.location.href)
  if (ids.length === 0) {
    url.searchParams.delete('tour')
  } else {
    url.searchParams.set('tour', ids.join(','))
  }
  window.history.replaceState({}, '', url.toString())
}

function App() {
  const allRestaurants = parseRestaurants()
  const [selectedList, setSelectedList] = createSignal<Restaurant[]>([])
  const [theme, setTheme] = createSignal<Theme>('dark')

  // Load from URL on mount
  onMount(() => {
    // Load list from URL
    const ids = getIdsFromUrl()
    if (ids.length > 0) {
      const restored = ids
        .map(id => allRestaurants.find(r => r.id === id))
        .filter((r): r is Restaurant => r !== undefined)
      setSelectedList(restored)
    }

    // Load saved theme from localStorage (theme is personal preference, not shared)
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setTheme(prefersDark ? 'dark' : 'light')
    }
  })

  // Save list to URL whenever it changes
  createEffect(() => {
    const ids = selectedList().map(r => r.id)
    setIdsInUrl(ids)
  })

  // Apply theme to document and save to localStorage
  createEffect(() => {
    const currentTheme = theme()
    document.documentElement.setAttribute('data-theme', currentTheme)
    localStorage.setItem(THEME_KEY, currentTheme)
  })

  const toggleTheme = () => {
    setTheme(theme() === 'dark' ? 'light' : 'dark')
  }

  const availableRestaurants = () => {
    const selectedIds = new Set(selectedList().map(r => r.id))
    return allRestaurants.filter(r => !selectedIds.has(r.id))
  }

  const addRestaurant = (id: string) => {
    const restaurant = allRestaurants.find(r => r.id === id)
    if (restaurant) {
      setSelectedList([...selectedList(), restaurant])
    }
  }

  const removeRestaurant = (id: string) => {
    setSelectedList(selectedList().filter(r => r.id !== id))
  }

  const moveUp = (index: number) => {
    if (index <= 0) return
    const newList = [...selectedList()]
    const [removed] = newList.splice(index, 1)
    newList.splice(index - 1, 0, removed)
    setSelectedList(newList)
  }

  const moveDown = (index: number) => {
    const list = selectedList()
    if (index >= list.length - 1) return
    const newList = [...list]
    const [removed] = newList.splice(index, 1)
    newList.splice(index + 1, 0, removed)
    setSelectedList(newList)
  }

  const shareLink = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Yuki Tour Planner',
        text: `Check out my restaurant tour with ${selectedList().length} stops!`,
        url: window.location.href
      })
    } else {
      // Fallback to clipboard if share API not available
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div class="app">
      <header class="app-header">
        <div class="header-content">
          <h1>Yuki Tour Planner</h1>
          <p class="subtitle">Plan your restaurant tour in Japan</p>
        </div>
        <div class="header-actions">
          {selectedList().length > 0 && (
            <button 
              type="button" 
              class="share-btn"
              onClick={shareLink}
              aria-label="Copy share link"
            >
              Share
            </button>
          )}
          <button 
            type="button" 
            class="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme() === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme() === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div class="add-section">
        <label for="restaurant-select">Add a restaurant:</label>
        <select 
          id="restaurant-select"
          onChange={(e) => {
            const value = e.currentTarget.value
            if (value) {
              addRestaurant(value)
              e.currentTarget.value = ''
            }
          }}
        >
          <option value="">Select a restaurant...</option>
          <For each={availableRestaurants()}>
            {(restaurant) => (
              <option value={restaurant.id}>{restaurant.title}</option>
            )}
          </For>
        </select>
      </div>

      <div class="list-section">
        <h2>Your Tour ({selectedList().length} stops)</h2>
        
        {selectedList().length === 0 ? (
          <p class="empty-message">No restaurants added yet. Select one from the dropdown above.</p>
        ) : (
          <ul class="restaurant-list">
            <For each={selectedList()}>
              {(restaurant, index) => (
                <li class="restaurant-item">
                  <div class="restaurant-header">
                    <span class="position">{index() + 1}.</span>
                    <span class="restaurant-title">{restaurant.title}</span>
                    <div class="header-buttons">
                      <div class="move-buttons">
                        <button
                          type="button"
                          class="move-btn move-up"
                          onClick={() => moveUp(index())}
                          disabled={index() === 0}
                          aria-label={`Move ${restaurant.title} up`}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          class="move-btn move-down"
                          onClick={() => moveDown(index())}
                          disabled={index() === selectedList().length - 1}
                          aria-label={`Move ${restaurant.title} down`}
                        >
                          ▼
                        </button>
                      </div>
                      <button
                        type="button"
                        class="remove-btn"
                        onClick={() => removeRestaurant(restaurant.id)}
                        aria-label={`Remove ${restaurant.title}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div 
                    class="restaurant-content"
                    innerHTML={restaurant.html}
                  />
                </li>
              )}
            </For>
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
