window.addEventListener("message", async (e) => {
    switch (e.data.type) {
        case "get-inventory-data": {
            const idList = e.data.ids;
            const marketHashNames = [];
            for (let i = 0; i < idList.length; i++) {
                const id = idList[i];
                const item = g_ActiveInventory.m_rgAssets[id];
                if (item && item.description.marketable === 1) {
                    marketHashNames.push({
                        market_hash_name: item.description.market_hash_name,
                        id: item.appid + '_' + item.contextid + '_' + id,
                    });
                }
            }
            window.postMessage(
                {
                    type: "response-inventory-data",
                    marketHashNames: marketHashNames
                },
                "*"
            );
            break;
        }
    }
});