// src/debug.ts
import { Client } from '@notionhq/client'
import dotenv from 'dotenv'

dotenv.config()

async function listDatabases() {
  const notion = new Client({ auth: process.env.NOTION_KEY })

  console.log('🔍 开始尝试连接 Notion...')
  console.log('🔑 使用的 Key 后四位:', process.env.NOTION_KEY?.slice(-4))

  try {
    // 搜索机器人能看到的所有 Database
    const response = await notion.search({
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    })

    console.log('\n✅ 连接成功！以下是机器人能看到的数据库列表：')
    console.log('---------------------------------------------')

    if (response.results.length === 0) {
      console.log('⚠️  列表为空！机器人连接成功，但没有看到任何数据库。')
      console.log('👉  请检查：你真的把机器人邀请进数据库了吗？')
    } else {
      response.results.forEach((page: any) => {
        console.log('page: ', page)
        const title = page.title?.[0]?.plain_text || '无标题'
        console.log(`📝 数据库名称: ${title}`)
        console.log(`🆔 真实 ID:    ${page.id}`) // 复制这个 ID！
        console.log(`🔗 链接:      ${page.url}`)
        console.log('---------------------------------------------')
      })
    }
  } catch (error: any) {
    console.error('\n❌ 连接失败！错误信息：')
    console.error(error.message)
  }
}

listDatabases()
