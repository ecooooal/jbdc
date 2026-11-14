import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDatabase } from '@/features/database/react';
import {
  createDesign,
  DESIGN_NAME_MAX_LENGTH,
  InvalidDesignNameError,
} from '@/features/designs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';

export default function NewDesignScreen() {
  const database = useDatabase();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0 && trimmedName.length <= DESIGN_NAME_MAX_LENGTH;

  function create() {
    try {
      createDesign(database, { name });
    } catch (caught) {
      if (caught instanceof InvalidDesignNameError) {
        setError(caught.message);
        return;
      }

      throw caught;
    }

    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1 gap-6 px-6 pt-6">
          <View className="gap-1">
            <Text variant="h3">New design</Text>
            <Text variant="muted">A name is all it needs. The rest can come later.</Text>
          </View>

          <View className="gap-2">
            <Text variant="small">Name</Text>
            <Input
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
              placeholder="Silk slip dress"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={canCreate ? create : undefined}
              maxLength={DESIGN_NAME_MAX_LENGTH}
              accessibilityLabel="Design name"
            />
            {error ? <Text className="text-destructive text-sm">{error}</Text> : null}
          </View>

          <View className="flex-row gap-3">
            <Button variant="ghost" className="flex-1" onPress={() => router.back()}>
              <Text>Cancel</Text>
            </Button>
            <Button className="flex-1" disabled={!canCreate} onPress={create}>
              <Text>Create</Text>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
