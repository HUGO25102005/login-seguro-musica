import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Cargar variables de entorno desde .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Se necesita la service_role para bypass RLS e insertar

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Faltan variables de entorno (URL o SERVICE_ROLE_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function ingestData() {
  try {
    const dataPath = path.join(process.cwd(), 'data.json')
    const rawData = fs.readFileSync(dataPath, 'utf8')
    const musicData = JSON.parse(rawData)

    console.log(`🚀 Iniciando ingesta de ${musicData.length} registros...`)

    const { data, error } = await supabase
      .from('music_catalog')
      .insert(musicData)

    if (error) {
      throw error
    }

    console.log('✅ Ingesta completada con éxito.')
  } catch (error) {
    console.error('❌ Error durante la ingesta:', error)
  }
}

ingestData()
