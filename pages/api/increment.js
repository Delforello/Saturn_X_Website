
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://yaahlgatgawcvsksmbev.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let { data, error } = await supabase
      .from('downloads')
      .select('count')
      .eq('id', 1)
      .single()

    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('downloads')
        .insert({ id: 1, count: 0 })
        .select()
        .single()
      if (insertError) throw insertError
      data = newData
    } else if (error) throw error

    const { data: updatedData, error: updateError } = await supabase
      .from('downloads')
      .update({ count: data.count + 1 })
      .eq('id', 1)
      .select()
      .single()

    if (updateError) throw updateError

    res.status(200).json({ count: updatedData.count })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}
