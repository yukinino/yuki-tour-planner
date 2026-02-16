import { createSignal, createEffect, For, onMount } from 'solid-js'
import { marked } from 'marked'

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
    <div class="w-full max-w-[700px] p-8 max-sm:p-4">
      <header class="flex justify-between items-start mb-8 max-sm:mb-5">
        <div>
          <h1 class="m-0 mb-1 text-[2rem] max-sm:text-2xl font-extrabold tracking-tight">
            Yuki Tour Planner
          </h1>
          <p class="text-text-secondary m-0 text-sm font-medium">Plan your restaurant tour in Japan</p>
        </div>
        <div class="flex gap-2">
          {selectedList().length > 0 && (
            <button 
              type="button" 
              class="bg-accent-soft border-2 border-accent text-accent rounded-full px-4 py-2 text-sm font-bold cursor-pointer transition-all duration-200 hover:bg-accent hover:text-bg-primary hover:shadow-[0_4px_14px_var(--card-glow)] hover:scale-105 active:scale-95"
              onClick={shareLink}
              aria-label="Copy share link"
            >
              Share
            </button>
          )}
          <button 
            type="button" 
            class="bg-accent-soft border-2 border-border text-text-primary rounded-full w-10 h-10 text-lg cursor-pointer transition-all duration-200 hover:border-accent hover:shadow-[0_4px_14px_var(--card-glow)] hover:scale-110 active:scale-95 flex items-center justify-center"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme() === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme() === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
        </div>
      </header>

      <div class="mb-8 max-sm:mb-5">
        <label for="restaurant-select" class="block mb-2 font-bold text-sm text-text-secondary tracking-wide uppercase">Add a restaurant</label>
        <select 
          id="restaurant-select"
          class="w-full p-3.5 text-base rounded-2xl border-2 border-border bg-bg-primary text-text-primary cursor-pointer transition-all duration-200 hover:border-accent focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)] font-medium"
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

      <div>
        <h2 class="mb-4 font-bold text-lg">Your Tour <span class="text-accent font-extrabold">({selectedList().length} stops)</span></h2>
        
        {selectedList().length === 0 ? (
          <div class="text-text-secondary text-center py-10 max-sm:py-6">
            <p class="text-3xl mb-2">( ' - ' )</p>
            <p class="font-medium">No restaurants added yet.</p>
            <p class="text-sm">Select one from the dropdown above!</p>
          </div>
        ) : (
          <ul class="list-none p-0 m-0">
            <For each={selectedList()}>
              {(restaurant, index) => (
                <li class="bg-bg-tertiary border-2 border-border rounded-2xl mb-4 max-sm:mb-3 transition-all duration-200 ease-in-out hover:border-accent hover:shadow-[0_6px_24px_var(--card-glow)] hover:-translate-y-0.5">
                  <div class="flex items-center px-4 py-3 gap-3 max-sm:px-3 max-sm:py-2.5 max-sm:gap-2">
                    <span class="font-extrabold text-accent min-w-7 text-lg">{index() + 1}.</span>
                    <span class="flex-1 text-base font-bold max-sm:text-sm">{restaurant.title}</span>
                    <div class="flex items-center gap-1.5">
                      <div class="flex flex-row gap-1">
                        <button
                          type="button"
                          class="bg-bg-secondary border-2 border-border rounded-xl px-2.5 py-1.5 text-[0.75rem] cursor-pointer text-text-primary leading-none transition-all duration-200 hover:not-disabled:border-accent hover:not-disabled:bg-accent-soft hover:not-disabled:scale-110 disabled:opacity-25 disabled:cursor-not-allowed max-sm:px-3 max-sm:py-2 active:not-disabled:scale-95"
                          onClick={() => moveUp(index())}
                          disabled={index() === 0}
                          aria-label={`Move ${restaurant.title} up`}
                        >
                          &#9650;
                        </button>
                        <button
                          type="button"
                          class="bg-bg-secondary border-2 border-border rounded-xl px-2.5 py-1.5 text-[0.75rem] cursor-pointer text-text-primary leading-none transition-all duration-200 hover:not-disabled:border-accent hover:not-disabled:bg-accent-soft hover:not-disabled:scale-110 disabled:opacity-25 disabled:cursor-not-allowed max-sm:px-3 max-sm:py-2 active:not-disabled:scale-95"
                          onClick={() => moveDown(index())}
                          disabled={index() === selectedList().length - 1}
                          aria-label={`Move ${restaurant.title} down`}
                        >
                          &#9660;
                        </button>
                      </div>
                      <button
                        type="button"
                        class="bg-transparent border-none text-danger text-xl max-sm:text-lg cursor-pointer px-1.5 leading-none opacity-60 transition-all duration-150 hover:opacity-100 hover:scale-125 active:scale-90"
                        onClick={() => removeRestaurant(restaurant.id)}
                        aria-label={`Remove ${restaurant.title}`}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  <div 
                    class="restaurant-content px-4 pb-3 max-sm:px-3 max-sm:pb-2 border-t-2 border-border"
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
