import { campaignData, useCampaign } from '../store';
import { allAssets, restoreAssets } from './assets';

export async function exportBackup() {
  const data = { app: 'dcc-dnd', version: 1, savedAt: new Date().toISOString(), campaign: campaignData(), assets: await allAssets() };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${data.campaign.name.replace(/[^\w-]+/g, '_')}-${data.savedAt.slice(0, 10)}.dcc.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export async function importBackup(file: File) {
  const data = JSON.parse(await file.text());
  if (data.app !== 'dcc-dnd' || !data.campaign) throw new Error('This is not a DCC-DnD backup file.');
  await restoreAssets(data.assets ?? {});
  useCampaign.getState().replaceAll(data.campaign);
}
