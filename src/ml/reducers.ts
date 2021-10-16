
export function contains_word (ser, term='search') {
  let pat = new RegExp("(^|\\W)+" + term + "\\W*", "i")

  for (let i = 0; i < ser.length; i++) {
    const str = ser[i];
    if ((str + '').match(pat) != null) return 1
  }

  return 0
}

export function contains_search(ser) {
  return contains_word(ser, 'search')
}

export function contains_google(ser) {
  return contains_word(ser, 'google')
}

export function is_grouped(ser){
    return (!contains_word(ser, '-1'))
}

export function is_edge_domain(ser) {
    return contains_word(ser, 'edge://')  // since \W+ doesnt match start of the string
}

export function is_tab_loading(ser) {
    return contains_word(ser, 'loading')
}

export function is_tab_complete(ser) {
    return contains_word(ser, 'complete')
}

export function is_tab_unloaded(ser) {
    return contains_word(ser, 'unloaded')
}

export function calculate_tab_life(row: Array<any>) {
  const MAX_TIME = 3*24*60*60*1000 // 3 Days

  if (row.length == 0)
    return 1

  const ret = row.map(startTime => {
    const timeDelta = Date.now() - startTime
    const cappedTime = Math.min(timeDelta, MAX_TIME) 
    const normalisedTime = (cappedTime / MAX_TIME)

    return normalisedTime
  })
  
  return ret[0]
}

export function bool_to_int(row) {
  return row.map(val => {
    if (typeof val == "boolean"){
      return val ? 1:0
    } else {
      return val
    }
  })
  
}