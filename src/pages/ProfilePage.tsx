import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { UserProfile } from '@/types/profile';
import { toast } from 'sonner';
import { User } from 'lucide-react';

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { profile, loading, error, saveProfile } = useProfile();
  const [form, setForm] = useState<UserProfile>(profile);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const updateField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const image = await readAsDataUrl(file);
      updateField('avatar', image);
    } catch {
      toast.error('Could not read selected image');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveProfile(form);
      toast.success('Profile saved');
    } catch {
      toast.error('Could not save profile to API');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-6 lg:p-8">
      <Card className="max-w-2xl rounded-3xl">
        <CardHeader>
          <CardTitle className="text-3xl font-display">Profile</CardTitle>
          <CardDescription>Manage your identity and coding platform handles.</CardDescription>
          {error && <p className="text-xs text-muted-foreground">{error}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center">
                {form.avatar ? (
                  <img src={form.avatar} alt="Profile avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatar">Profile Picture</Label>
                <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={form.name}
                onChange={event => updateField('name', event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leetcode">LeetCode ID</Label>
                <Input
                  id="leetcode"
                  placeholder="e.g. johndoe"
                  value={form.leetcodeId}
                  onChange={event => updateField('leetcodeId', event.target.value.trim())}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codeforces">Codeforces ID</Label>
                <Input
                  id="codeforces"
                  placeholder="e.g. tourist"
                  value={form.codeforcesId}
                  onChange={event => updateField('codeforcesId', event.target.value.trim())}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default-view">Default Saved Question View</Label>
              <Select
                value={form.defaultQuestionView}
                onValueChange={value =>
                  updateField('defaultQuestionView', value === 'solution' ? 'solution' : 'practice')
                }
              >
                <SelectTrigger id="default-view">
                  <SelectValue placeholder="Choose default view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="practice">Practice editor first</SelectItem>
                  <SelectItem value="solution">Show solution first</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
