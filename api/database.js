import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

export default async (req, res) => {
    const token = process.env.ENV_NOTION_TOKEN;
    const databaseId = process.env.ENV_DATABASE_ID;
    const checkboxName = process.env.ENV_CHECKBOX_PROPERTY_NAME;  // Name of the checkbox property

    try {
        // 获取所有页面的数据（支持分页）
        let allResults = [];
        let hasMore = true;
        let nextCursor = undefined;

        while (hasMore) {
            const requestBody = nextCursor
                ? JSON.stringify({ start_cursor: nextCursor })
                : undefined;

            const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Notion-Version': '2021-05-13',
                    'Content-Type': 'application/json'
                },
                body: requestBody
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(`Notion API error: ${response.status} ${JSON.stringify(data)}`);
            }

            allResults = allResults.concat(data.results);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        const processedData = processData(allResults, checkboxName);
        res.json(processedData);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: error.message });
    }
};

const processData = (data, checkboxName) => {
    const checkboxMap = new Map();

    data.forEach(item => {
        if (item.properties.Date && item.properties[checkboxName]) {
            // 检查 Date 属性类型是否为 created_time，并且有值
            if (item.properties.Date.type === 'created_time' &&
                item.properties.Date.created_time &&
                item.properties[checkboxName].checkbox) {

                // 转换为北京时间（UTC+8）
                const options = {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    timeZone: 'Asia/Shanghai' // 北京时间
                };
                const dateObject = new Date(item.properties.Date.created_time);
                const Rawdate = dateObject.toLocaleDateString('zh-CN', options);
                const date = Rawdate.replace(/\//g, '-');
                checkboxMap.set(date, item.properties[checkboxName].checkbox);
            }
        }
    });

    return Array.from(checkboxMap).map(([date, isChecked]) => ({ date, isChecked }));
};
