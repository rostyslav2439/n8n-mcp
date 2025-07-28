/**
 * Enhanced Configuration Validator Service
 * 
 * Provides operation-aware validation for n8n nodes with reduced false positives.
 * Supports multiple validation modes and node-specific logic.
 */

import { ConfigValidator, ValidationResult, ValidationError, ValidationWarning } from './config-validator';
import { NodeSpecificValidators, NodeValidationContext } from './node-specific-validators';

export type ValidationMode = 'full' | 'operation' | 'minimal';
export type ValidationProfile = 'strict' | 'runtime' | 'ai-friendly' | 'minimal';

export interface EnhancedValidationResult extends ValidationResult {
  mode: ValidationMode;
  profile?: ValidationProfile;
  operation?: {
    resource?: string;
    operation?: string;
    action?: string;
  };
  examples?: Array<{
    description: string;
    config: Record<string, any>;
  }>;
  nextSteps?: string[];
}

export interface OperationContext {
  resource?: string;
  operation?: string;
  action?: string;
  mode?: string;
}

export class EnhancedConfigValidator extends ConfigValidator {
  /**
   * Validate with operation awareness
   */
  static validateWithMode(
    nodeType: string,
    config: Record<string, any>,
    properties: any[],
    mode: ValidationMode = 'operation',
    profile: ValidationProfile = 'ai-friendly'
  ): EnhancedValidationResult {
    // Extract operation context from config
    const operationContext = this.extractOperationContext(config);
    
    // Filter properties based on mode and operation
    const filteredProperties = this.filterPropertiesByMode(
      properties,
      config,
      mode,
      operationContext
    );
    
    // Perform base validation on filtered properties
    const baseResult = super.validate(nodeType, config, filteredProperties);
    
    // Enhance the result
    const enhancedResult: EnhancedValidationResult = {
      ...baseResult,
      mode,
      profile,
      operation: operationContext,
      examples: [],
      nextSteps: []
    };
    
    // Apply profile-based filtering
    this.applyProfileFilters(enhancedResult, profile);
    
    // Add operation-specific enhancements
    this.addOperationSpecificEnhancements(nodeType, config, enhancedResult);
    
    // Deduplicate errors
    enhancedResult.errors = this.deduplicateErrors(enhancedResult.errors);
    
    // Examples removed - use validate_node_operation for configuration guidance
    
    // Generate next steps based on errors
    enhancedResult.nextSteps = this.generateNextSteps(enhancedResult);
    
    return enhancedResult;
  }
  
  /**
   * Extract operation context from configuration
   */
  private static extractOperationContext(config: Record<string, any>): OperationContext {
    return {
      resource: config.resource,
      operation: config.operation,
      action: config.action,
      mode: config.mode
    };
  }
  
  /**
   * Filter properties based on validation mode and operation
   */
  private static filterPropertiesByMode(
    properties: any[],
    config: Record<string, any>,
    mode: ValidationMode,
    operation: OperationContext
  ): any[] {
    switch (mode) {
      case 'minimal':
        // Only required properties that are visible
        return properties.filter(prop => 
          prop.required && this.isPropertyVisible(prop, config)
        );
        
      case 'operation':
        // Only properties relevant to the current operation
        return properties.filter(prop => 
          this.isPropertyRelevantToOperation(prop, config, operation)
        );
        
      case 'full':
      default:
        // All properties (current behavior)
        return properties;
    }
  }
  
  /**
   * Check if property is relevant to current operation
   */
  private static isPropertyRelevantToOperation(
    prop: any,
    config: Record<string, any>,
    operation: OperationContext
  ): boolean {
    // First check if visible
    if (!this.isPropertyVisible(prop, config)) {
      return false;
    }
    
    // If no operation context, include all visible
    if (!operation.resource && !operation.operation && !operation.action) {
      return true;
    }
    
    // Check if property has operation-specific display options
    if (prop.displayOptions?.show) {
      const show = prop.displayOptions.show;
      
      // Check each operation field
      if (operation.resource && show.resource) {
        const expectedResources = Array.isArray(show.resource) ? show.resource : [show.resource];
        if (!expectedResources.includes(operation.resource)) {
          return false;
        }
      }
      
      if (operation.operation && show.operation) {
        const expectedOps = Array.isArray(show.operation) ? show.operation : [show.operation];
        if (!expectedOps.includes(operation.operation)) {
          return false;
        }
      }
      
      if (operation.action && show.action) {
        const expectedActions = Array.isArray(show.action) ? show.action : [show.action];
        if (!expectedActions.includes(operation.action)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Add operation-specific enhancements to validation result
   */
  private static addOperationSpecificEnhancements(
    nodeType: string,
    config: Record<string, any>,
    result: EnhancedValidationResult
  ): void {
    // Create context for node-specific validators
    const context: NodeValidationContext = {
      config,
      errors: result.errors,
      warnings: result.warnings,
      suggestions: result.suggestions,
      autofix: result.autofix || {}
    };
    
    // Use node-specific validators
    switch (nodeType) {
      case 'nodes-base.slack':
        NodeSpecificValidators.validateSlack(context);
        this.enhanceSlackValidation(config, result);
        break;
        
      case 'nodes-base.googleSheets':
        NodeSpecificValidators.validateGoogleSheets(context);
        this.enhanceGoogleSheetsValidation(config, result);
        break;
        
      case 'nodes-base.httpRequest':
        // Use existing HTTP validation from base class
        this.enhanceHttpRequestValidation(config, result);
        break;
        
      case 'nodes-base.code':
        NodeSpecificValidators.validateCode(context);
        break;
        
      case 'nodes-base.openAi':
        NodeSpecificValidators.validateOpenAI(context);
        break;
        
      case 'nodes-base.mongoDb':
        NodeSpecificValidators.validateMongoDB(context);
        break;
        
      case 'nodes-base.webhook':
        NodeSpecificValidators.validateWebhook(context);
        break;
        
      case 'nodes-base.postgres':
        NodeSpecificValidators.validatePostgres(context);
        break;
        
      case 'nodes-base.mysql':
        NodeSpecificValidators.validateMySQL(context);
        break;
    }
    
    // Update autofix if changes were made
    if (Object.keys(context.autofix).length > 0) {
      result.autofix = context.autofix;
    }
  }
  
  /**
   * Enhanced Slack validation with operation awareness
   */
  private static enhanceSlackValidation(
    config: Record<string, any>,
    result: EnhancedValidationResult
  ): void {
    const { resource, operation } = result.operation || {};
    
    if (resource === 'message' && operation === 'send') {
      // Examples removed - validation focuses on error detection
      
      // Check for common issues
      if (!config.channel && !config.channelId) {
        const channelError = result.errors.find(e => 
          e.property === 'channel' || e.property === 'channelId'
        );
        if (channelError) {
          channelError.message = 'To send a Slack message, specify either a channel name (e.g., "#general") or channel ID';
          channelError.fix = 'Add channel: "#general" or use a channel ID like "C1234567890"';
        }
      }
    }
  }
  
  /**
   * Enhanced Google Sheets validation
   */
  private static enhanceGoogleSheetsValidation(
    config: Record<string, any>,
    result: EnhancedValidationResult
  ): void {
    const { operation } = result.operation || {};
    
    if (operation === 'append') {
      // Examples removed - validation focuses on configuration correctness
      
      // Validate range format
      if (config.range && !config.range.includes('!')) {
        result.warnings.push({
          type: 'inefficient',
          property: 'range',
          message: 'Range should include sheet name (e.g., "Sheet1!A:B")',
          suggestion: 'Format: "SheetName!A1:B10" or "SheetName!A:B" for entire columns'
        });
      }
    }
  }
  
  /**
   * Enhanced HTTP Request validation
   */
  private static enhanceHttpRequestValidation(
    config: Record<string, any>,
    result: EnhancedValidationResult
  ): void {
    // Examples removed - validation provides error messages and fixes instead
  }
  
  /**
   * Generate actionable next steps based on validation results
   */
  private static generateNextSteps(result: EnhancedValidationResult): string[] {
    const steps: string[] = [];
    
    // Group errors by type
    const requiredErrors = result.errors.filter(e => e.type === 'missing_required');
    const typeErrors = result.errors.filter(e => e.type === 'invalid_type');
    const valueErrors = result.errors.filter(e => e.type === 'invalid_value');
    
    if (requiredErrors.length > 0) {
      steps.push(`Add required fields: ${requiredErrors.map(e => e.property).join(', ')}`);
    }
    
    if (typeErrors.length > 0) {
      steps.push(`Fix type mismatches: ${typeErrors.map(e => `${e.property} should be ${e.fix}`).join(', ')}`);
    }
    
    if (valueErrors.length > 0) {
      steps.push(`Correct invalid values: ${valueErrors.map(e => e.property).join(', ')}`);
    }
    
    if (result.warnings.length > 0 && result.errors.length === 0) {
      steps.push('Consider addressing warnings for better reliability');
    }
    
    if (result.errors.length > 0) {
      steps.push('Fix the errors above following the provided suggestions');
    }
    
    return steps;
  }
  
  
  /**
   * Deduplicate errors based on property and type
   * Prefers more specific error messages over generic ones
   */
  private static deduplicateErrors(errors: ValidationError[]): ValidationError[] {
    const seen = new Map<string, ValidationError>();
    
    for (const error of errors) {
      const key = `${error.property}-${error.type}`;
      const existing = seen.get(key);
      
      if (!existing) {
        seen.set(key, error);
      } else {
        // Keep the error with more specific message or fix
        const existingLength = (existing.message?.length || 0) + (existing.fix?.length || 0);
        const newLength = (error.message?.length || 0) + (error.fix?.length || 0);
        
        if (newLength > existingLength) {
          seen.set(key, error);
        }
      }
    }
    
    return Array.from(seen.values());
  }
  
  /**
   * Apply profile-based filtering to validation results
   */
  private static applyProfileFilters(
    result: EnhancedValidationResult,
    profile: ValidationProfile
  ): void {
    switch (profile) {
      case 'minimal':
        // Only keep missing required errors
        result.errors = result.errors.filter(e => e.type === 'missing_required');
        result.warnings = [];
        result.suggestions = [];
        break;
        
      case 'runtime':
        // Keep critical runtime errors only
        result.errors = result.errors.filter(e => 
          e.type === 'missing_required' || 
          e.type === 'invalid_value' ||
          (e.type === 'invalid_type' && e.message.includes('undefined'))
        );
        // Keep only security warnings
        result.warnings = result.warnings.filter(w => w.type === 'security');
        result.suggestions = [];
        break;
        
      case 'strict':
        // Keep everything, add more suggestions
        if (result.warnings.length === 0 && result.errors.length === 0) {
          result.suggestions.push('Consider adding error handling with onError property and timeout configuration');
          result.suggestions.push('Add authentication if connecting to external services');
        }
        // Require error handling for external service nodes
        this.enforceErrorHandlingForProfile(result, profile);
        break;
        
      case 'ai-friendly':
      default:
        // Current behavior - balanced for AI agents
        // Filter out noise but keep helpful warnings
        result.warnings = result.warnings.filter(w => 
          w.type !== 'inefficient' || !w.property?.startsWith('_')
        );
        // Add error handling suggestions for AI-friendly profile
        this.addErrorHandlingSuggestions(result);
        break;
    }
  }
  
  /**
   * Enforce error handling requirements based on profile
   */
  private static enforceErrorHandlingForProfile(
    result: EnhancedValidationResult,
    profile: ValidationProfile
  ): void {
    // Only enforce for strict profile on external service nodes
    if (profile !== 'strict') return;
    
    const nodeType = result.operation?.resource || '';
    const errorProneTypes = ['httpRequest', 'webhook', 'database', 'api', 'slack', 'email', 'openai'];
    
    if (errorProneTypes.some(type => nodeType.toLowerCase().includes(type))) {
      // Add general warning for strict profile
      // The actual error handling validation is done in node-specific validators
      result.warnings.push({
        type: 'best_practice',
        property: 'errorHandling',
        message: 'External service nodes should have error handling configured',
        suggestion: 'Add onError: "continueRegularOutput" or "stopWorkflow" with retryOnFail: true for resilience'
      });
    }
  }
  
  /**
   * Add error handling suggestions for AI-friendly profile
   */
  private static addErrorHandlingSuggestions(
    result: EnhancedValidationResult
  ): void {
    // Check if there are any network/API related errors
    const hasNetworkErrors = result.errors.some(e => 
      e.message.toLowerCase().includes('url') || 
      e.message.toLowerCase().includes('endpoint') ||
      e.message.toLowerCase().includes('api')
    );
    
    if (hasNetworkErrors) {
      result.suggestions.push(
        'For API calls, consider adding onError: "continueRegularOutput" with retryOnFail: true and maxTries: 3'
      );
    }
    
    // Check for webhook configurations
    const isWebhook = result.operation?.resource === 'webhook' || 
                     result.errors.some(e => e.message.toLowerCase().includes('webhook'));
    
    if (isWebhook) {
      result.suggestions.push(
        'Webhooks should use onError: "continueRegularOutput" to ensure responses are always sent'
      );
    }
  }
}