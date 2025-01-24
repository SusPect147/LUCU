import TonConnectUI from '@tonconnect/ui';

const tonConnectUI = new TonConnectUI({ //connect application
    manifestUrl: 'https://t.me/TESTforTESTTESTforTESTbot/manifest.json',
    buttonRootId: 'ton-connect'
});

const transaction = {
    messages: [
        {
            address: "UQBPHPJsnXJut6zzXtrVdUbUwga5F8_KfBn0fK8G4U7D_H_U", // destination address
            amount: "20000000" //Toncoin in nanotons
        }
    ]
}

const result = await tonConnectUI.sendTransaction(transaction)